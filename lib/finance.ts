import { prisma } from "@/lib/prisma";

export async function getBucketBalances(userId: string): Promise<Map<string, number>> {
  const sums = await prisma.transaction.groupBy({
    by: ["bucketId", "direction"],
    where: { userId, bucketId: { not: null } },
    _sum: { amount: true },
  });

  const balances = new Map<string, number>();
  for (const s of sums) {
    if (!s.bucketId) continue;
    const current = balances.get(s.bucketId) ?? 0;
    const delta = (s._sum.amount ?? 0) * (s.direction === "IN" ? 1 : -1);
    balances.set(s.bucketId, current + delta);
  }
  return balances;
}

export async function getAccountBalances(userId: string): Promise<Map<string, number>> {
  const sums = await prisma.transaction.groupBy({
    by: ["accountId", "direction"],
    where: { userId },
    _sum: { amount: true },
  });

  const balances = new Map<string, number>();
  for (const s of sums) {
    const current = balances.get(s.accountId) ?? 0;
    const delta = (s._sum.amount ?? 0) * (s.direction === "IN" ? 1 : -1);
    balances.set(s.accountId, current + delta);
  }
  return balances;
}
