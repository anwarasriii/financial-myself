import { formatMoney } from "@/lib/format";
import { bucketColor } from "@/lib/palette";
import { ProgressBar } from "./ProgressBar";
import type { AllocationSuggestion } from "@/lib/allocation-engine";

export function AllocationPanel({
  suggestion,
  colorIndexFor,
}: {
  suggestion: AllocationSuggestion;
  colorIndexFor: (bucketId: string) => number;
}) {
  const maxAmount = Math.max(1, ...suggestion.lines.map((l) => l.amount));

  return (
    <section className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="card-title">This month&apos;s suggested split</h2>
          <span className="text-sm text-base-content/70">
            Income: {formatMoney(suggestion.income)}
          </span>
        </div>

        {suggestion.lines.length === 0 ? (
          <p className="text-sm text-base-content/70">
            Add an income entry and some buckets to see a suggested allocation.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {suggestion.lines.map((line) => {
              const color = bucketColor(colorIndexFor(line.bucketId));
              return (
                <li key={line.bucketId} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${color.dot}`} />
                      {line.bucketName}
                    </span>
                    <span className="font-medium tabular-nums">{formatMoney(line.amount)}</span>
                  </div>
                  <ProgressBar ratio={line.amount / maxAmount} colorClass={color.progress} />
                  <span className="text-xs text-base-content/60">{line.reason}</span>
                </li>
              );
            })}
          </ul>
        )}

        {suggestion.unallocated > 0 && (
          <p className="text-sm text-base-content/70">
            Unallocated: {formatMoney(suggestion.unallocated)}
          </p>
        )}

        {suggestion.flags.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-base-300 pt-4">
            {suggestion.flags.map((flag, i) => (
              <div
                key={i}
                role="alert"
                className={`alert ${flag.severity === "warning" ? "alert-warning" : "alert-info"} py-2 text-sm`}
              >
                <span>{flag.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
