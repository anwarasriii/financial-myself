import "server-only";
import { GoogleGenAI } from "@google/genai";

export interface AiParsedRow {
  date: string; // ISO 8601
  description: string;
  amount: number;
  direction: "IN" | "OUT";
  bucketName: string | null;
}

export interface AiParseResult {
  rows: AiParsedRow[];
  error?: string;
}

interface RawTransaction {
  date?: unknown;
  description?: unknown;
  amount?: unknown;
  direction?: unknown;
  bucket?: unknown;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Transaction date as YYYY-MM-DD." },
          description: { type: "string", description: "Merchant or transfer description." },
          amount: { type: "number", description: "Always positive; sign is conveyed by direction." },
          direction: {
            type: "string",
            enum: ["IN", "OUT"],
            description: "IN for money received/deposited, OUT for money spent/withdrawn.",
          },
          bucket: {
            type: ["string", "null"],
            description: "Best-matching bucket name from the provided list, or null if none fit.",
          },
        },
        required: ["date", "description", "amount", "direction"],
      },
    },
  },
  required: ["transactions"],
};

// Only called when the user explicitly clicks "Parse with AI" — this is the
// one place in the import flow where statement text (merchant names,
// amounts, counterparty names) leaves the server and goes to Google's
// Gemini API. Nothing here is persisted by us; the request/response live
// only in this call.
export async function parseStatementWithAI(
  text: string,
  bucketNames: string[]
): Promise<AiParseResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      rows: [],
      error: "AI parsing isn't set up yet (missing GEMINI_API_KEY on the server).",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const bucketList = bucketNames.length > 0 ? bucketNames.join(", ") : "(no buckets configured)";
  const prompt = `You are extracting transactions from the raw text layer of a bank statement PDF (likely a Malaysian bank such as Maybank). The text below may contain page headers/footers, running balances, disclaimers, and other non-transaction boilerplate mixed in with real transactions — ignore all of that.

For every real transaction, extract: date, a short description (merchant/transfer name, without reference numbers or balance figures), amount (always positive), and direction (IN for money received, OUT for money spent/transferred out).

Also assign each transaction the single best-matching bucket from this list, or null if none clearly fit: ${bucketList}

Return only transactions you are confident are real (skip account summaries, "total debit/credit" lines, ledger balances, and disclaimer text).

Statement text:
"""
${text}
"""`;

  try {
    const response = await ai.models.generateContent({
      // "latest" alias so this doesn't go stale again as Google rolls models
      // forward — it currently resolves to gemini-3.6-flash.
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });

    const raw = response.text;
    if (!raw) {
      return { rows: [], error: "The AI returned an empty response." };
    }

    let parsed: { transactions?: RawTransaction[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { rows: [], error: "The AI's response wasn't valid JSON." };
    }

    const rows: AiParsedRow[] = [];
    for (const t of parsed.transactions ?? []) {
      if (typeof t.date !== "string" || typeof t.description !== "string") continue;
      const date = new Date(t.date);
      if (isNaN(date.getTime())) continue;
      const amount = typeof t.amount === "number" ? t.amount : Number(t.amount);
      if (!Number.isFinite(amount) || amount === 0) continue;
      const description = t.description.trim();
      if (!description) continue;

      rows.push({
        date: date.toISOString(),
        description,
        amount: Math.abs(amount),
        direction: t.direction === "IN" ? "IN" : "OUT",
        bucketName: typeof t.bucket === "string" && t.bucket.trim() ? t.bucket.trim() : null,
      });
    }

    if (rows.length === 0) {
      return { rows: [], error: "The AI couldn't find any transactions in this statement." };
    }
    return { rows };
  } catch (err) {
    return {
      rows: [],
      error: err instanceof Error ? `AI parsing failed: ${err.message}` : "AI parsing failed.",
    };
  }
}
