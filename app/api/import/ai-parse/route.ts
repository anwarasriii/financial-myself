import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { parseStatementWithAI } from "@/lib/ai-parse";

// Only reached when the user explicitly clicks "Parse with AI" in the import
// UI — takes text already extracted from the user's PDF (client already has
// it from the initial local-parse attempt) and sends it to Google's Gemini
// API for structuring. Nothing here is written to disk or logged.
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: { file: ["No statement text provided."] } }, { status: 400 });
  }

  const buckets = await prisma.bucket.findMany({ where: { userId } });
  const result = await parseStatementWithAI(text, buckets.map((b) => b.name));

  if (result.error) {
    return NextResponse.json({ error: { file: [result.error] } }, { status: 400 });
  }

  const bucketIdByNameLower = new Map(buckets.map((b) => [b.name.toLowerCase(), b.id]));
  const rows = result.rows.map((row) => ({
    date: row.date,
    description: row.description,
    amount: row.amount,
    direction: row.direction,
    suggestedBucketId: row.bucketName ? bucketIdByNameLower.get(row.bucketName.toLowerCase()) ?? null : null,
  }));

  return NextResponse.json({ status: "ok", rows });
}
