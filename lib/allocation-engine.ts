import { prisma } from "@/lib/prisma";

const DEFAULT_EMERGENCY_FUND_MONTHS = 4.5; // midpoint of the recommended 3-6 months
const DEFAULT_DAILY_USE_PERCENT = 0.2;
const DEFAULT_EMERGENCY_TOPUP_PERCENT = 0.1;
const SINKING_FUND_DUE_SOON_MONTHS = 2;

type BucketWithRelations = Awaited<ReturnType<typeof loadBuckets>>[number];

async function loadBuckets(userId: string) {
  return prisma.bucket.findMany({
    where: { userId },
    include: {
      sinkingFundItems: true,
      goals: { orderBy: { rank: "asc" } },
      recurringBills: { where: { active: true } },
    },
    orderBy: { priority: "asc" },
  });
}

async function getAverageMonthlySpend(userId: string, kind: "DAILY_USE" | "BILLS") {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      direction: "OUT",
      date: { gte: threeMonthsAgo },
      bucket: { kind },
    },
    _sum: { amount: true },
  });

  return (result._sum.amount ?? 0) / 3;
}

function ruleAmount(
  rules: { bucketId: string; type: "PERCENT" | "FIXED"; value: number }[],
  bucketId: string,
  income: number,
  fallback: number
) {
  const rule = rules.find((r) => r.bucketId === bucketId);
  if (!rule) return fallback;
  return rule.type === "PERCENT" ? income * (rule.value / 100) : rule.value;
}

export interface AllocationLine {
  bucketId: string;
  bucketName: string;
  kind: string;
  amount: number;
  reason: string;
}

export interface AllocationFlag {
  severity: "warning" | "info";
  message: string;
}

export interface AllocationSuggestion {
  income: number;
  lines: AllocationLine[];
  totalAllocated: number;
  unallocated: number;
  flags: AllocationFlag[];
}

export async function computeAllocationSuggestion(
  userId: string,
  options?: { incomeAmount?: number; emergencyFundMonths?: number }
): Promise<AllocationSuggestion> {
  const buckets = await loadBuckets(userId);
  const allocationRules = await prisma.allocationRule.findMany({ where: { userId } });
  const balances = await prisma.transaction.groupBy({
    by: ["bucketId", "direction"],
    where: { userId, bucketId: { not: null } },
    _sum: { amount: true },
  });

  const balanceMap = new Map<string, number>();
  for (const b of balances) {
    if (!b.bucketId) continue;
    const current = balanceMap.get(b.bucketId) ?? 0;
    const delta = (b._sum.amount ?? 0) * (b.direction === "IN" ? 1 : -1);
    balanceMap.set(b.bucketId, current + delta);
  }

  let income = options?.incomeAmount;
  if (income === undefined) {
    const latestIncome = await prisma.income.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
    });
    income = latestIncome?.amount ?? 0;
  }

  const lines: AllocationLine[] = [];
  const flags: AllocationFlag[] = [];
  let remaining = income;

  const findByKind = (kind: string) => buckets.find((b) => b.kind === kind);

  // 1. Fixed obligations (bills) first.
  const billsBucket = findByKind("BILLS");
  if (billsBucket) {
    const billsTotal = billsBucket.recurringBills.reduce((sum, b) => sum + b.amount, 0);
    const amount = Math.min(billsTotal, Math.max(remaining, 0));
    if (billsTotal > 0) {
      lines.push({
        bucketId: billsBucket.id,
        bucketName: billsBucket.name,
        kind: billsBucket.kind,
        amount,
        reason: `Covers ${billsBucket.recurringBills.length} active recurring bill(s)`,
      });
      remaining -= amount;
      if (amount < billsTotal) {
        flags.push({
          severity: "warning",
          message: `Income doesn't fully cover "${billsBucket.name}" — short by RM${(billsTotal - amount).toFixed(2)}.`,
        });
      }
    }
  }

  // 2. Sinking fund top-up.
  const sinkingBucket = findByKind("SINKING_FUND");
  if (sinkingBucket) {
    let sinkingTotal = 0;
    for (const item of sinkingBucket.sinkingFundItems) {
      const monthlyRequired = item.currentSaved >= item.annualCost ? 0 : item.annualCost / 12;
      sinkingTotal += monthlyRequired;

      const monthsUntilDue = monthsUntil(item.dueMonth);
      if (monthsUntilDue <= SINKING_FUND_DUE_SOON_MONTHS && item.currentSaved < item.annualCost) {
        flags.push({
          severity: "warning",
          message: `"${item.name}" is due in ${monthsUntilDue} month(s) and only RM${item.currentSaved.toFixed(2)} of RM${item.annualCost.toFixed(2)} is saved.`,
        });
      }
    }
    const amount = Math.min(sinkingTotal, Math.max(remaining, 0));
    if (sinkingTotal > 0) {
      lines.push({
        bucketId: sinkingBucket.id,
        bucketName: sinkingBucket.name,
        kind: sinkingBucket.kind,
        amount,
        reason: `Monthly share of ${sinkingBucket.sinkingFundItems.length} annual cost item(s)`,
      });
      remaining -= amount;
    }
  }

  // 3. Emergency fund, until target reached.
  const emergencyBucket = findByKind("EMERGENCY_FUND");
  if (emergencyBucket) {
    const months = options?.emergencyFundMonths ?? DEFAULT_EMERGENCY_FUND_MONTHS;
    const [avgDailyUse, avgBills] = await Promise.all([
      getAverageMonthlySpend(userId, "DAILY_USE"),
      getAverageMonthlySpend(userId, "BILLS"),
    ]);
    const monthlyExpenseEstimate =
      avgDailyUse + avgBills ||
      (billsBucket?.recurringBills.reduce((sum, b) => sum + b.amount, 0) ?? 0);
    const target = emergencyBucket.targetAmount ?? monthlyExpenseEstimate * months;
    const currentBalance = balanceMap.get(emergencyBucket.id) ?? 0;
    const gap = Math.max(0, target - currentBalance);

    const desiredTopup = Math.min(gap, income * DEFAULT_EMERGENCY_TOPUP_PERCENT);
    const amount = Math.min(desiredTopup, Math.max(remaining, 0));
    if (amount > 0) {
      lines.push({
        bucketId: emergencyBucket.id,
        bucketName: emergencyBucket.name,
        kind: emergencyBucket.kind,
        amount,
        reason: `Target RM${target.toFixed(2)} (${months} months of expenses), RM${gap.toFixed(2)} to go`,
      });
      remaining -= amount;
    } else if (gap === 0 && target > 0) {
      flags.push({ severity: "info", message: `"${emergencyBucket.name}" has reached its target.` });
    } else if (target === 0) {
      flags.push({
        severity: "info",
        message: `Add some bills or daily-use spending history to estimate an "${emergencyBucket.name}" target.`,
      });
    }
  }

  // 4. Daily use.
  const dailyUseBucket = findByKind("DAILY_USE");
  if (dailyUseBucket) {
    const fallback = income * DEFAULT_DAILY_USE_PERCENT;
    const desired = ruleAmount(allocationRules, dailyUseBucket.id, income, fallback);
    const amount = Math.min(desired, Math.max(remaining, 0));
    lines.push({
      bucketId: dailyUseBucket.id,
      bucketName: dailyUseBucket.name,
      kind: dailyUseBucket.kind,
      amount,
      reason: allocationRules.some((r) => r.bucketId === dailyUseBucket.id)
        ? "Based on your allocation rule"
        : `Default estimate (${DEFAULT_DAILY_USE_PERCENT * 100}% of income)`,
    });
    remaining -= amount;
  }

  // 5. Remainder split across entertainment + goal buckets, by rule weight (default equal).
  const remainderBuckets: BucketWithRelations[] = buckets.filter(
    (b) => b.kind === "ENTERTAINMENT" || b.kind === "GOAL"
  );
  if (remainderBuckets.length > 0 && remaining > 0) {
    const weights = remainderBuckets.map((b) => {
      const rule = allocationRules.find((r) => r.bucketId === b.id);
      return rule && rule.type === "PERCENT" ? rule.value : 1;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0) || remainderBuckets.length;

    remainderBuckets.forEach((b, i) => {
      const share = (remaining * weights[i]) / totalWeight;
      if (share > 0) {
        lines.push({
          bucketId: b.id,
          bucketName: b.name,
          kind: b.kind,
          amount: share,
          reason: "Share of remaining income after mandatory buckets",
        });
      }
    });
    remaining = 0;
  }

  if (remaining < 0) {
    flags.push({
      severity: "warning",
      message: `This month's income is RM${Math.abs(remaining).toFixed(2)} short of covering bills, sinking fund, and daily use.`,
    });
  }

  const totalAllocated = lines.reduce((sum, l) => sum + l.amount, 0);

  return {
    income,
    lines,
    totalAllocated,
    unallocated: Math.max(0, income - totalAllocated),
    flags,
  };
}

function monthsUntil(dueMonth: number): number {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const diff = dueMonth - currentMonth;
  return diff >= 0 ? diff : diff + 12;
}
