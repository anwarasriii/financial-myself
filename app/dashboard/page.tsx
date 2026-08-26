import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBucketBalances, getAccountBalances } from "@/lib/finance";
import { computeAllocationSuggestion } from "@/lib/allocation-engine";
import { formatMoney } from "@/lib/format";
import { AllocationPanel } from "./AllocationPanel";
import { BucketCard } from "./BucketCard";
import { QuickAdd } from "./QuickAdd";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [accounts, buckets, recentIncome, bucketBalances, accountBalances, suggestion] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.bucket.findMany({
      where: { userId },
      include: {
        sinkingFundItems: true,
        goals: { orderBy: { rank: "asc" } },
        recurringBills: { where: { active: true } },
        transactions: { orderBy: { date: "desc" }, take: 10 },
      },
      orderBy: { priority: "asc" },
    }),
    prisma.income.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 5 }),
    getBucketBalances(userId),
    getAccountBalances(userId),
    computeAllocationSuggestion(userId),
  ]);

  const colorIndexByBucketId = new Map(buckets.map((b, i) => [b.id, i]));
  const bucketsByAccount = new Map<string, typeof buckets>();
  for (const bucket of buckets) {
    const list = bucketsByAccount.get(bucket.accountId) ?? [];
    list.push(bucket);
    bucketsByAccount.set(bucket.accountId, list);
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financial Myself</h1>
          <p className="text-sm text-base-content/70">
            {session.user.name ?? session.user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/analytics" className="btn btn-outline btn-sm">
            Analytics
          </Link>
          <Link href="/dashboard/import" className="btn btn-outline btn-sm">
            Import statement
          </Link>
          <SignOutButton />
        </div>
      </header>

      <AllocationPanel
        suggestion={suggestion}
        colorIndexFor={(bucketId) => colorIndexByBucketId.get(bucketId) ?? 0}
      />

      <QuickAdd accounts={accounts} buckets={buckets} recentIncome={recentIncome} />

      <section className="flex flex-col gap-8">
        {accounts.map((account) => (
          <div key={account.id}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-medium">{account.name}</h2>
              <span className="text-sm tabular-nums text-base-content/70">
                {formatMoney(accountBalances.get(account.id) ?? 0)}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(bucketsByAccount.get(account.id) ?? []).map((bucket) => (
                <BucketCard
                  key={bucket.id}
                  bucket={bucket}
                  balance={bucketBalances.get(bucket.id) ?? 0}
                  colorIndex={colorIndexByBucketId.get(bucket.id) ?? 0}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
