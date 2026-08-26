import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlySpendingByBucket, getNetWorthTrend, getSavingsRateTrend } from "@/lib/analytics";
import { bucketCssColor } from "@/lib/palette";
import { SpendingTrendChart, NetWorthChart, SavingsRateChart } from "./AnalyticsCharts";

const MONTHS = 6;

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [buckets, accounts, spending, netWorth, savingsRate] = await Promise.all([
    prisma.bucket.findMany({ where: { userId }, orderBy: { priority: "asc" } }),
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getMonthlySpendingByBucket(userId, MONTHS),
    getNetWorthTrend(userId, MONTHS),
    getSavingsRateTrend(userId, MONTHS),
  ]);

  const bucketColors = Object.fromEntries(buckets.map((b, i) => [b.name, bucketCssColor(i)]));
  const accountColors = Object.fromEntries(accounts.map((a, i) => [a.name, bucketCssColor(i)]));

  const hasSpending = spending.bucketNames.length > 0;
  const hasNetWorth = netWorth.accountNames.length > 0 && netWorth.rows.some((r) => r.total !== 0);
  const hasIncome = savingsRate.some((r) => r.income !== 0);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-base-content/70">Last {MONTHS} months</p>
        </div>
        <Link href="/dashboard" className="btn btn-outline btn-sm">
          Back to dashboard
        </Link>
      </header>

      <section className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title text-base">Spending by bucket</h2>
          {hasSpending ? (
            <SpendingTrendChart
              rows={spending.rows}
              bucketNames={spending.bucketNames}
              colors={bucketColors}
            />
          ) : (
            <p className="text-sm text-base-content/60">
              No spending logged yet in this window &mdash; log some transactions or import a
              statement to see trends here.
            </p>
          )}
        </div>
      </section>

      <section className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title text-base">Savings rate</h2>
          <p className="text-xs text-base-content/50">
            Net money moved into Emergency Fund, Sinking Fund, and Goal buckets each month,
            divided by income logged that month.
          </p>
          {hasIncome ? (
            <SavingsRateChart rows={savingsRate} />
          ) : (
            <p className="text-sm text-base-content/60">
              No income logged yet in this window &mdash; log your salary/income to see your
              savings rate here.
            </p>
          )}
        </div>
      </section>

      <section className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title text-base">Net worth</h2>
          <p className="text-xs text-base-content/50">
            Derived from your logged transaction history (income + spending across all accounts),
            not a live bank balance &mdash; it&apos;s only as accurate as what&apos;s been logged
            or imported.
          </p>
          {hasNetWorth ? (
            <NetWorthChart
              rows={netWorth.rows}
              accountNames={netWorth.accountNames}
              colors={accountColors}
            />
          ) : (
            <p className="text-sm text-base-content/60">
              No transactions logged yet &mdash; net worth trend will appear once you have some
              history.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
