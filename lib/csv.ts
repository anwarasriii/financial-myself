import {
  parseFlexibleDate,
  parseFlexibleAmount,
  type ParsedStatementRow,
  type StatementParseResult,
} from "@/lib/statement-shared";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}

const DATE_SYNONYMS = ["date", "transaction date", "posting date", "value date", "trans date"];
const DESC_SYNONYMS = [
  "description", "details", "narration", "particulars", "transaction details", "remark", "remarks",
];
const AMOUNT_SYNONYMS = ["amount", "value"];
const DEBIT_SYNONYMS = ["debit", "withdrawal", "debit amount", "money out"];
const CREDIT_SYNONYMS = ["credit", "deposit", "credit amount", "money in"];

function findColumn(headers: string[], synonyms: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const syn of synonyms) {
    const exact = normalized.indexOf(syn);
    if (exact !== -1) return exact;
  }
  for (let i = 0; i < normalized.length; i++) {
    if (synonyms.some((s) => normalized[i].includes(s))) return i;
  }
  return -1;
}

export function parseStatement(text: string): StatementParseResult {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { rows: [], error: "The file doesn't have any data rows." };
  }

  const [headers, ...dataRows] = table;
  const dateCol = findColumn(headers, DATE_SYNONYMS);
  const descCol = findColumn(headers, DESC_SYNONYMS);
  const amountCol = findColumn(headers, AMOUNT_SYNONYMS);
  const debitCol = findColumn(headers, DEBIT_SYNONYMS);
  const creditCol = findColumn(headers, CREDIT_SYNONYMS);

  if (dateCol === -1 || descCol === -1) {
    return {
      rows: [],
      error:
        "Couldn't find date/description columns. Expected headers like \"Date\" and \"Description\".",
    };
  }
  if (amountCol === -1 && debitCol === -1 && creditCol === -1) {
    return {
      rows: [],
      error: "Couldn't find an amount column. Expected \"Amount\", or \"Debit\"/\"Credit\".",
    };
  }

  const rows: ParsedStatementRow[] = [];
  for (const cells of dataRows) {
    const date = parseFlexibleDate(cells[dateCol] ?? "");
    const description = (cells[descCol] ?? "").trim();
    if (!date || !description) continue;

    let amount: number | null = null;
    let direction: "IN" | "OUT" = "OUT";

    if (debitCol !== -1 || creditCol !== -1) {
      const debit = debitCol !== -1 ? parseFlexibleAmount(cells[debitCol] ?? "") : null;
      const credit = creditCol !== -1 ? parseFlexibleAmount(cells[creditCol] ?? "") : null;
      if (debit) {
        amount = Math.abs(debit);
        direction = "OUT";
      } else if (credit) {
        amount = Math.abs(credit);
        direction = "IN";
      }
    } else {
      const value = parseFlexibleAmount(cells[amountCol] ?? "");
      if (value !== null) {
        amount = Math.abs(value);
        direction = value < 0 ? "OUT" : "IN";
      }
    }

    if (amount === null || amount === 0) continue;

    rows.push({ date: date.toISOString(), description, amount, direction });
  }

  return { rows };
}
