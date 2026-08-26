"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, Bucket, Income } from "@/app/generated/prisma/client";
import { formatMoney } from "@/lib/format";
import { DeleteButton } from "./DeleteButton";

export function QuickAdd({
  accounts,
  buckets,
  recentIncome,
}: {
  accounts: Account[];
  buckets: Bucket[];
  recentIncome: Income[];
}) {
  const router = useRouter();
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeSource, setIncomeSource] = useState("Salary");
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txDirection, setTxDirection] = useState<"IN" | "OUT">("OUT");
  const [txAccountId, setTxAccountId] = useState(accounts[0]?.id ?? "");
  const [txBucketId, setTxBucketId] = useState(
    buckets.find((b) => b.accountId === accounts[0]?.id)?.id ?? ""
  );
  const [pending, setPending] = useState<"income" | "transaction" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitIncome(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending("income");
    const res = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(incomeAmount),
        source: incomeSource,
        date: new Date().toISOString(),
      }),
    });
    setPending(null);
    if (!res.ok) {
      setError("Couldn't save income.");
      return;
    }
    setIncomeAmount("");
    router.refresh();
  }

  async function submitTransaction(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending("transaction");
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(txAmount),
        direction: txDirection,
        accountId: txAccountId,
        bucketId: txBucketId || null,
        note: txNote || null,
        date: new Date().toISOString(),
      }),
    });
    setPending(null);
    if (!res.ok) {
      setError("Couldn't save transaction.");
      return;
    }
    setTxAmount("");
    setTxNote("");
    router.refresh();
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <form onSubmit={submitIncome} className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-2 p-4">
          <h3 className="text-sm font-medium">Log income</h3>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Amount"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              className="input input-sm w-28"
            />
            <input
              type="text"
              required
              placeholder="Source"
              value={incomeSource}
              onChange={(e) => setIncomeSource(e.target.value)}
              className="input input-sm flex-1"
            />
            <button
              type="submit"
              disabled={pending === "income"}
              className="btn btn-primary btn-sm"
            >
              Add
            </button>
          </div>
          {recentIncome.length > 0 && (
            <ul className="mt-1 flex flex-col gap-1 border-t border-base-300 pt-2">
              {recentIncome.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-base-content/70">
                    {entry.source}
                    <DeleteButton
                      endpoint={`/api/income/${entry.id}`}
                      confirmMessage={`Delete this income entry (${formatMoney(entry.amount)})?`}
                    />
                  </span>
                  <span className="tabular-nums text-base-content/70">
                    {formatMoney(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>

      <form onSubmit={submitTransaction} className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-2 p-4">
          <h3 className="text-sm font-medium">Log transaction</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={txDirection}
              onChange={(e) => setTxDirection(e.target.value as "IN" | "OUT")}
              className="select select-sm"
            >
              <option value="OUT">Spend</option>
              <option value="IN">Deposit</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Amount"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              className="input input-sm w-24"
            />
            <select
              value={txAccountId}
              onChange={(e) => {
                const nextAccountId = e.target.value;
                setTxAccountId(nextAccountId);
                setTxBucketId(buckets.find((b) => b.accountId === nextAccountId)?.id ?? "");
              }}
              className="select select-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              value={txBucketId}
              onChange={(e) => setTxBucketId(e.target.value)}
              className="select select-sm"
            >
              {buckets
                .filter((b) => b.accountId === txAccountId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
            <input
              type="text"
              placeholder="Description (e.g. McDonald's)"
              value={txNote}
              onChange={(e) => setTxNote(e.target.value)}
              className="input input-sm flex-1 min-w-[10rem]"
            />
            <button
              type="submit"
              disabled={pending === "transaction"}
              className="btn btn-primary btn-sm"
            >
              Add
            </button>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-error sm:col-span-2">{error}</p>}
    </section>
  );
}
