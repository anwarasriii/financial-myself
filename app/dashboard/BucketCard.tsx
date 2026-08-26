import { formatMoney, formatMonth, daysUntilDueDay, formatDueIn } from "@/lib/format";
import { bucketColor } from "@/lib/palette";
import { ProgressBar } from "./ProgressBar";
import { AddBillForm } from "./AddBillForm";
import { AddSinkingFundItemForm } from "./AddSinkingFundItemForm";
import { AddGoalForm } from "./AddGoalForm";
import { ProgressUpdateControl } from "./ProgressUpdateControl";
import { DeleteButton } from "./DeleteButton";
import type {
  Bucket,
  SinkingFundItem,
  Goal,
  RecurringBill,
  Transaction,
} from "@/app/generated/prisma/client";

type BucketWithRelations = Bucket & {
  sinkingFundItems: SinkingFundItem[];
  goals: Goal[];
  recurringBills: RecurringBill[];
  transactions: Transaction[];
};

const KIND_LABELS: Record<string, string> = {
  DAILY_USE: "Daily use",
  BILLS: "Need to pay",
  ENTERTAINMENT: "Entertainment",
  EMERGENCY_FUND: "Emergency fund",
  SINKING_FUND: "Sinking fund",
  GOAL: "Goal",
  DEBT: "Debt",
  OTHER: "Other",
};

const BILL_DUE_SOON_DAYS = 5;
// Kinds with their own dedicated, non-transaction item list (progress-tracked, not
// derived from money movements). Every other kind — including BILLS, which also
// shows recurring bill definitions above — falls back to a plain transaction log.
const NON_TRANSACTION_KINDS = ["SINKING_FUND", "GOAL"];

function monthsUntil(dueMonth: number): number {
  const now = new Date();
  const diff = dueMonth - (now.getMonth() + 1);
  return diff >= 0 ? diff : diff + 12;
}

export function BucketCard({
  bucket,
  balance,
  colorIndex,
}: {
  bucket: BucketWithRelations;
  balance: number;
  colorIndex: number;
}) {
  const color = bucketColor(colorIndex);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
              <h3 className="card-title text-base">{bucket.name}</h3>
            </div>
            <span className="badge badge-ghost badge-sm mt-1">
              {KIND_LABELS[bucket.kind] ?? bucket.kind}
            </span>
          </div>
          <span className="font-medium tabular-nums">{formatMoney(balance)}</span>
        </div>

        {bucket.targetAmount != null && (
          <div className="flex flex-col gap-1">
            <ProgressBar ratio={balance / bucket.targetAmount} colorClass={color.progress} />
            <span className="text-xs text-base-content/60">
              Target {formatMoney(bucket.targetAmount)}
            </span>
          </div>
        )}

        {bucket.kind === "SINKING_FUND" && (
          <div className="flex flex-col gap-3 border-t border-base-300 pt-3">
            <ul className="flex flex-col gap-3">
              {bucket.sinkingFundItems.map((item) => {
                const dueSoon = monthsUntil(item.dueMonth) <= 2 && item.currentSaved < item.annualCost;
                return (
                  <li key={item.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="flex items-center gap-1">
                        {item.name}
                        <DeleteButton
                          endpoint={`/api/sinking-fund-items/${item.id}`}
                          confirmMessage={`Delete "${item.name}"?`}
                        />
                      </span>
                      <span className="tabular-nums text-base-content/70">
                        {formatMoney(item.currentSaved)} / {formatMoney(item.annualCost)}
                      </span>
                    </div>
                    <ProgressBar
                      ratio={item.currentSaved / item.annualCost}
                      colorClass={dueSoon ? "progress-warning" : color.progress}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-base-content/60">
                        Due {formatMonth(item.dueMonth)}
                        {dueSoon ? " — underfunded, due soon" : ""}
                      </span>
                      <ProgressUpdateControl
                        endpoint={`/api/sinking-fund-items/${item.id}`}
                        field="currentSaved"
                        initialValue={item.currentSaved}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <AddSinkingFundItemForm bucketId={bucket.id} />
          </div>
        )}

        {bucket.kind === "GOAL" && (
          <div className="flex flex-col gap-3 border-t border-base-300 pt-3">
            <ul className="flex flex-col gap-3">
              {bucket.goals.map((goal) => (
                <li key={goal.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-1">
                      {goal.name}
                      <DeleteButton
                        endpoint={`/api/goals/${goal.id}`}
                        confirmMessage={`Delete "${goal.name}"?`}
                      />
                    </span>
                    <span className="tabular-nums text-base-content/70">
                      {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
                    </span>
                  </div>
                  <ProgressBar ratio={goal.currentAmount / goal.targetAmount} colorClass={color.progress} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-base-content/60">
                      {goal.targetDate
                        ? `Target date ${new Date(goal.targetDate).toLocaleDateString("en-MY", { timeZone: "UTC" })}`
                        : "No target date"}
                    </span>
                    <ProgressUpdateControl
                      endpoint={`/api/goals/${goal.id}`}
                      field="currentAmount"
                      initialValue={goal.currentAmount}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <AddGoalForm bucketId={bucket.id} />
          </div>
        )}

        {bucket.kind === "BILLS" && (
          <div className="flex flex-col gap-2 border-t border-base-300 pt-3">
            <ul className="flex flex-col gap-2">
              {bucket.recurringBills.map((bill) => {
                const days = daysUntilDueDay(bill.dueDay);
                const dueSoon = days <= BILL_DUE_SOON_DAYS;
                return (
                  <li key={bill.id} className="flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-1">
                      {bill.name}
                      <DeleteButton
                        endpoint={`/api/bills/${bill.id}`}
                        confirmMessage={`Delete "${bill.name}"?`}
                      />
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-base-content/70">
                        {formatMoney(bill.amount)}
                      </span>
                      <span className={`badge badge-sm ${dueSoon ? "badge-warning" : "badge-ghost"}`}>
                        {formatDueIn(days)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <AddBillForm bucketId={bucket.id} />
          </div>
        )}

        {!NON_TRANSACTION_KINDS.includes(bucket.kind) && bucket.transactions.length > 0 && (
          <ul className="flex flex-col gap-1 border-t border-base-300 pt-3">
            {bucket.transactions.map((txn) => (
              <li key={txn.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate">{txn.note || "—"}</span>
                  <DeleteButton
                    endpoint={`/api/transactions/${txn.id}`}
                    confirmMessage="Delete this transaction?"
                  />
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-base-content/60">
                  <span>{new Date(txn.date).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</span>
                  <span
                    className={`tabular-nums ${txn.direction === "OUT" ? "text-error" : "text-success"}`}
                  >
                    {txn.direction === "OUT" ? "-" : "+"}
                    {formatMoney(txn.amount)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
