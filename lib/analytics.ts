import { prisma } from "@/lib/prisma";
import type { BucketKind } from "@/app/generated/prisma/client";

export interface MonthlyBucketSpending {
  month: string; // "YYYY-MM"
  [bucketName: string]: number | string;
}

export interface NetWorthPoint {
  month: string; // "YYYY-MM"
  total: number;
  [accountName: string]: number | string;
}

export interface SavingsRatePoint {
  month: string; // "YYYY-MM"
  income: number;
  saved: number;
  rate: number; // saved / income, 0 when there's no income that month
}

const SAVINGS_KINDS: BucketKind[] = ["EMERGENCY_FUND", "SINKING_FUND", "GOAL"];

// Pure calendar-month keys, built with Date.UTC so this doesn't drift a
// month depending on the server's timezone (same reasoning as the date
// handling in lib/statement-shared.ts).
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastNMonthKeys(n: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return keys;
}

function startOfMonthKey(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

function endOfMonthKey(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1) - 1);
}

/** Total OUT spending per bucket, grouped by calendar month, for the last `months` months. */
export async function getMonthlySpendingByBucket(
  userId: string,
  months = 6
): Promise<{ rows: MonthlyBucketSpending[]; bucketNames: string[] }> {
  const monthKeys = lastNMonthKeys(months);
  const since = startOfMonthKey(monthKeys[0]);

  const transactions = await prisma.transaction.findMany({
    where: { userId, direction: "OUT", bucketId: { not: null }, date: { gte: since } },
    select: { date: true, amount: true, bucket: { select: { name: true } } },
  });

  const bucketNames = new Set<string>();
  const grid = new Map<string, Map<string, number>>();
  for (const key of monthKeys) grid.set(key, new Map());

  for (const t of transactions) {
    if (!t.bucket) continue;
    const key = monthKey(t.date);
    const monthMap = grid.get(key);
    if (!monthMap) continue; // outside the window (shouldn't happen given the `since` filter)
    bucketNames.add(t.bucket.name);
    monthMap.set(t.bucket.name, (monthMap.get(t.bucket.name) ?? 0) + t.amount);
  }

  const rows: MonthlyBucketSpending[] = monthKeys.map((key) => {
    const row: MonthlyBucketSpending = { month: key };
    for (const name of bucketNames) row[name] = grid.get(key)!.get(name) ?? 0;
    return row;
  });

  return { rows, bucketNames: Array.from(bucketNames) };
}

/**
 * Net worth per account at each month-end, for the last `months` months.
 * Derived entirely from the transaction ledger (same IN/OUT summing as
 * lib/finance.ts's current-balance functions) — there's no separate
 * "starting balance" concept in this app, so a month's balance is just the
 * running sum of every transaction up to that month's last instant.
 */
export async function getNetWorthTrend(
  userId: string,
  months = 6
): Promise<{ rows: NetWorthPoint[]; accountNames: string[] }> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true, amount: true, direction: true, accountId: true },
    orderBy: { date: "asc" },
  });

  const monthKeys = lastNMonthKeys(months);
  const runningBalance = new Map<string, number>(accounts.map((a) => [a.id, 0]));
  let idx = 0;

  const rows: NetWorthPoint[] = monthKeys.map((key) => {
    const monthEnd = endOfMonthKey(key);
    while (idx < transactions.length && transactions[idx].date <= monthEnd) {
      const t = transactions[idx];
      const delta = t.amount * (t.direction === "IN" ? 1 : -1);
      runningBalance.set(t.accountId, (runningBalance.get(t.accountId) ?? 0) + delta);
      idx++;
    }
    const row: NetWorthPoint = { month: key, total: 0 };
    let total = 0;
    for (const a of accounts) {
      const balance = runningBalance.get(a.id) ?? 0;
      row[a.name] = balance;
      total += balance;
    }
    row.total = total;
    return row;
  });

  return { rows, accountNames: accounts.map((a) => a.name) };
}

/**
 * % of income put toward savings/investment (Emergency Fund + Sinking Fund +
 * Goal buckets) each month, for the last `months` months. "Saved" is net —
 * money withdrawn from those buckets (e.g. a sinking-fund payout) reduces
 * the figure the same month, not just contributions.
 */
export async function getSavingsRateTrend(userId: string, months = 6): Promise<SavingsRatePoint[]> {
  const monthKeys = lastNMonthKeys(months);
  const since = startOfMonthKey(monthKeys[0]);

  const [incomeRecords, savingsTransactions] = await Promise.all([
    prisma.income.findMany({
      where: { userId, date: { gte: since } },
      select: { date: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: since }, bucket: { kind: { in: SAVINGS_KINDS } } },
      select: { date: true, amount: true, direction: true },
    }),
  ]);

  const incomeByMonth = new Map<string, number>();
  for (const record of incomeRecords) {
    const key = monthKey(record.date);
    incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + record.amount);
  }

  const savedByMonth = new Map<string, number>();
  for (const t of savingsTransactions) {
    const key = monthKey(t.date);
    const delta = t.amount * (t.direction === "IN" ? 1 : -1);
    savedByMonth.set(key, (savedByMonth.get(key) ?? 0) + delta);
  }

  return monthKeys.map((key) => {
    const income = incomeByMonth.get(key) ?? 0;
    const saved = savedByMonth.get(key) ?? 0;
    return { month: key, income, saved, rate: income > 0 ? saved / income : 0 };
  });
}
