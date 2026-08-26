import {
  parseFlexibleDate,
  parseFlexibleAmount,
  type ParsedStatementRow,
  type StatementParseResult,
} from "@/lib/statement-shared";

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

// Numeric (01/08/2026, 01-08-2026, 01.08.2026), ISO (2026-08-01), or
// month-name (01 Aug 2026, 1 August 2026) dates.
const DATE_PATTERN = String.raw`\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s+(?:${MONTHS})[a-z]*\s+\d{2,4}`;

// Optional currency prefix, digits with optional thousand separators, 2dp,
// optional parens/leading sign, optional trailing DR/CR marker.
const AMOUNT_PATTERN = String.raw`(?:RM|MYR)?\s?\(?-?[\d,]+\.\d{2}\)?\s?(?:DR|CR)?`;

const SINGLE_LINE_PATTERN = new RegExp(
  `^(${DATE_PATTERN})\\s+(.+?)\\s+(${AMOUNT_PATTERN})(?=\\s|$)`,
  "i"
);

function resolveDirection(rawAmount: string, numericValue: number): "IN" | "OUT" {
  if (/DR/i.test(rawAmount)) return "OUT";
  if (/CR/i.test(rawAmount)) return "IN";
  return numericValue < 0 ? "OUT" : "IN";
}

// Strategy 1: one line per transaction — "DATE  DESCRIPTION  AMOUNT [BALANCE]".
function parseSingleLineStatement(text: string): ParsedStatementRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ParsedStatementRow[] = [];

  for (const line of lines) {
    const match = line.match(SINGLE_LINE_PATTERN);
    if (!match) continue;

    const [, rawDate, rawDescription, rawAmount] = match;
    const date = parseFlexibleDate(rawDate);
    const description = rawDescription.trim().replace(/^[-:]+\s*/, "");
    const value = parseFlexibleAmount(rawAmount);
    if (!date || !description || value === null || value === 0) continue;

    rows.push({
      date: date.toISOString(),
      description,
      amount: Math.abs(value),
      direction: resolveDirection(rawAmount, value),
    });
  }

  return rows;
}

// Strategy 2: a transaction spans several stacked lines, as printed by Maybank
// and similar statements:
//   03/07  TRANSFER TO A/C
//   MUHAMMAD ANWAR BIN *          467.00+          541.40
//   Rumah Sewa
//   Garden
//   03/07  SALE DEBIT
//   ...
// The date+type line has no year; the name/amount/balance line carries a
// trailing +/- sign; any lines after that until the next date belong to the
// same transaction as extra description context.
const DATE_HEADER_PATTERN = /^(\d{1,2})\/(\d{1,2})(?:\s+(.*))?$/;

// Matches the FIRST money-shaped token on the line — a signed amount,
// optionally marked DR/CR — and stops there. Deliberately doesn't require
// anything about what follows (a balance column, a footnote, nothing at
// all), since real statements are inconsistent about what trails the
// amount; whatever comes after is simply not part of the match.
const BLOCK_AMOUNT_PATTERN = /^(.*?)\s*([+-]?)([\d,]+\.\d{2})([+-]?)(?:\s*(dr|cr))?(?=\s|$)/i;

// Column headings, running totals, and page furniture that show up between
// real transactions (especially at page breaks) and would otherwise get
// glued onto the nearest transaction's description as if it were content.
const NOISE_LINE_PATTERNS = [
  /^tarikh (masuk|nilai)$/i,
  /^entry date$/i,
  /^value date$/i,
  /^butir urusniaga/i,
  /^transaction description$/i,
  /^jumlah urusniaga$/i,
  /^transaction amount$/i,
  /^baki penyata$/i,
  /^statement balance$/i,
  /^urusniaga akaun/i,
  /^account transactions?$/i,
  /^beginning balance$/i,
  /^(balance\s+)?(b\/f|c\/f|brought forward|carried forward)$/i,
  /^page \d+( of \d+)?$/i,
  /^muka surat \d+/i,
];

function isKnownNoiseLine(line: string): boolean {
  return NOISE_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

// Once the transaction list ends, statements print a closing summary
// (ledger/total debit/credit) followed by disclaimer and notice text —
// e.g. cheque-clearing notices — that reads nothing like a transaction but
// still contains numbers, which is why a permissive amount matcher would
// otherwise happily "detect" it. Any of these marks the start of that
// section; everything from there is skipped until a real date line (if
// any) shows we're back in transaction territory.
const FOOTER_SECTION_MARKERS = [
  /ledger balance/i,
  /available balance/i,
  /closing balance/i,
  /ending balance/i,
  /total debit/i,
  /total credit/i,
  /\bmuka\b.*\bpage\b/i,
];

function startsFooterSection(line: string): boolean {
  return FOOTER_SECTION_MARKERS.some((pattern) => pattern.test(line));
}

// Lines that repeat verbatim several times and are never a date or amount
// line are almost always header/footer boilerplate repeated on every page,
// not real transaction content — a reference number or merchant name won't
// coincidentally appear more than once, word-for-word, in one statement.
function findRepeatedNoiseLines(lines: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (DATE_HEADER_PATTERN.test(line) || BLOCK_AMOUNT_PATTERN.test(line)) continue;
    const key = line.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const repeated = new Set<string>();
  for (const [key, count] of counts) {
    if (count >= 2) repeated.add(key);
  }
  return repeated;
}

function parseBlockStatement(text: string, year: number): ParsedStatementRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const repeatedNoise = findRepeatedNoiseLines(lines);
  const rows: ParsedStatementRow[] = [];
  // currentDate is sticky: some statements repeat the date on every
  // transaction line, others print it once per day and leave same-day
  // transactions below it without their own date line. Either layout works
  // as long as we don't clear the date just because one transaction closed.
  let currentDate: Date | null = null;
  let descLines: string[] = [];
  let lastRow: ParsedStatementRow | null = null;
  let inFooterSection = false;

  const flushTrailingContext = () => {
    if (lastRow && descLines.length > 0) {
      lastRow.description = `${lastRow.description} ${descLines.join(" ")}`.trim();
    }
    descLines = [];
  };

  for (const line of lines) {
    if (isKnownNoiseLine(line) || repeatedNoise.has(line.toLowerCase())) continue;

    // Only treat these markers as "the transaction list has ended" once
    // we've actually found a transaction — the same words (Total Debit,
    // Total Credit, Ledger Balance) commonly also appear in an account
    // summary box printed BEFORE the itemized list, which would otherwise
    // suppress the entire statement before it even starts.
    if (rows.length > 0 && startsFooterSection(line)) {
      inFooterSection = true;
      continue;
    }

    const dateMatch = line.match(DATE_HEADER_PATTERN);
    if (dateMatch) {
      const [, d, m, rest] = dateMatch;
      const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
      if (!isNaN(date.getTime())) {
        // Lines collected since the last completed row were trailing
        // context for it (reference numbers, notes) — not part of the
        // next transaction, which starts fresh from this date line.
        flushTrailingContext();
        currentDate = date;
        inFooterSection = false; // a real date line means we're back among transactions
        if (rest) descLines.push(rest.trim());
        continue;
      }
    }

    if (inFooterSection) continue;

    if (currentDate) {
      const amountMatch = line.match(BLOCK_AMOUNT_PATTERN);
      if (amountMatch) {
        const [, leading, leadingSign, amountStr, trailingSign, drCr] = amountMatch;
        if (leading.trim()) descLines.push(leading.trim());

        const value = parseFlexibleAmount(amountStr);
        if (value !== null && value !== 0) {
          const isOut = drCr ? /dr/i.test(drCr) : leadingSign === "-" || trailingSign === "-";
          const description = descLines.filter(Boolean).join(" ").trim() || "Transaction";
          const row: ParsedStatementRow = {
            date: currentDate.toISOString(),
            description,
            amount: Math.abs(value),
            direction: isOut ? "OUT" : "IN",
          };
          rows.push(row);
          lastRow = row;
        }
        descLines = [];
        continue;
      }
    }

    descLines.push(line);
  }

  flushTrailingContext();
  return rows;
}

export function parseStatementFromText(
  text: string,
  options?: { year?: number }
): StatementParseResult {
  const singleLineRows = parseSingleLineStatement(text);
  if (singleLineRows.length > 0) return { rows: singleLineRows };

  const year = options?.year ?? new Date().getFullYear();
  const blockRows = parseBlockStatement(text, year);
  if (blockRows.length > 0) return { rows: blockRows };

  return {
    rows: [],
    error: "Couldn't find any transaction lines in this PDF.",
  };
}
