import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ImportClient } from "./ImportClient";
import { RulesManager } from "./RulesManager";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [accounts, buckets, rules] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.bucket.findMany({ where: { userId }, orderBy: { priority: "asc" } }),
    prisma.categoryRule.findMany({
      where: { userId },
      include: { bucket: true },
      orderBy: { keyword: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <div>
        <Link href="/dashboard" className="text-sm link link-primary">
          &larr; Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Import bank statement</h1>
        <p className="text-sm text-base-content/70">
          Upload a CSV or PDF export from your bank &mdash; including a password-protected PDF, if
          that&apos;s all your bank gives you. Rows are matched against your keyword rules and
          shown here for review before anything is saved.
        </p>
      </div>

      <ImportClient accounts={accounts} buckets={buckets} />

      <RulesManager buckets={buckets} rules={rules} />
    </main>
  );
}
