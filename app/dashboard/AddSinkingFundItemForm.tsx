"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { formatMonth } from "@/lib/format";

export function AddSinkingFundItemForm({ bucketId }: { bucketId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [annualCost, setAnnualCost] = useState("");
  const [dueMonth, setDueMonth] = useState("1");
  const [currentSaved, setCurrentSaved] = useState("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/sinking-fund-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucketId,
        name,
        annualCost: Number(annualCost),
        dueMonth: Number(dueMonth),
        currentSaved: Number(currentSaved),
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Couldn't save item.");
      return;
    }
    setName("");
    setAnnualCost("");
    setDueMonth("1");
    setCurrentSaved("0");
    close();
    router.refresh();
  }

  return (
    <Modal triggerLabel="+ Add item" title="Add a sinking fund item">
      {(close) => (
        <form onSubmit={(e) => submit(e, close)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Road tax"
              className="input w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Annual cost (RM)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={annualCost}
              onChange={(e) => setAnnualCost(e.target.value)}
              required
              className="input w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Due month</span>
            <select
              value={dueMonth}
              onChange={(e) => setDueMonth(e.target.value)}
              className="select w-full"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Already saved (RM)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={currentSaved}
              onChange={(e) => setCurrentSaved(e.target.value)}
              className="input w-full"
            />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Saving..." : "Add item"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
