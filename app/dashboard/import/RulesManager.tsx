"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Bucket, CategoryRule } from "@/app/generated/prisma/client";
import { DeleteButton } from "../DeleteButton";

type RuleWithBucket = CategoryRule & { bucket: Bucket };

export function RulesManager({
  buckets,
  rules,
}: {
  buckets: Bucket[];
  rules: RuleWithBucket[];
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [bucketId, setBucketId] = useState(buckets[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/category-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, bucketId }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Couldn't save rule.");
      return;
    }
    setKeyword("");
    router.refresh();
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <div>
          <h2 className="card-title text-base">Auto-categorize rules</h2>
          <p className="text-sm text-base-content/70">
            When a statement description contains one of these keywords, that bucket is
            suggested automatically. Add your own, or delete ones that don&apos;t fit.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Keyword</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
              placeholder="e.g. grabfood"
              className="input input-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Bucket</span>
            <select
              value={bucketId}
              onChange={(e) => setBucketId(e.target.value)}
              className="select select-sm"
            >
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
            Add rule
          </button>
        </form>
        {error && <p className="text-sm text-error">{error}</p>}

        {rules.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {rules.map((rule) => (
              <li key={rule.id} className="badge badge-lg gap-1">
                <span>
                  {rule.keyword} &rarr; {rule.bucket.name}
                </span>
                <DeleteButton
                  endpoint={`/api/category-rules/${rule.id}`}
                  confirmMessage={`Delete the "${rule.keyword}" rule?`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
