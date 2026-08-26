export interface ParsedStatementRow {
  date: string;
  description: string;
  amount: number;
  direction: "IN" | "OUT";
}

export interface StatementParseResult {
  rows: ParsedStatementRow[];
  error?: string;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Transaction dates are calendar days with no meaningful time-of-day, so we
// always build them as UTC midnight — using the local-time Date(y, m, d)
// constructor here would silently shift the day depending on the server's
// timezone (e.g. a server running ahead of UTC rolls the date back by one).
export function parseFlexibleDate(raw: string): Date | null {
  const trimmed = raw.trim();

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    if (!isNaN(date.getTime())) return date;
  }

  const monthName = trimmed.match(/^(\d{1,2})\s+([a-z]{3,9})\s+(\d{2,4})$/i);
  if (monthName) {
    const [, d, monthStr, y] = monthName;
    const monthIndex = MONTH_INDEX[monthStr.slice(0, 3).toLowerCase()];
    if (monthIndex !== undefined) {
      const year = y.length === 2 ? 2000 + Number(y) : Number(y);
      const date = new Date(Date.UTC(year, monthIndex, Number(d)));
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Date-only ISO strings (YYYY-MM-DD) parse as UTC per spec, so this is
  // safe as a final fallback.
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function parseFlexibleAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-()]/g, "");
  if (!cleaned) return null;
  let negative = false;
  let stripped = cleaned;
  if (stripped.startsWith("(") && stripped.endsWith(")")) {
    negative = true;
    stripped = stripped.slice(1, -1);
  }
  if (stripped.startsWith("-")) {
    negative = true;
    stripped = stripped.slice(1);
  }
  const value = parseFloat(stripped);
  if (isNaN(value)) return null;
  return negative ? -value : value;
}
