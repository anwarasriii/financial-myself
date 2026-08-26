"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

export function AddGoalForm({ bucketId }: { bucketId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucketId,
        name,
        targetAmount: Number(targetAmount),
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        currentAmount: Number(currentAmount),
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Couldn't save goal.");
      return;
    }
    setName("");
    setTargetAmount("");
    setTargetDate("");
    setCurrentAmount("0");
    close();
    router.refresh();
  }

  return (
    <Modal triggerLabel="+ Add goal" title="Add a goal">
      {(close) => (
        <form onSubmit={(e) => submit(e, close)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="New laptop"
              className="input w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Target amount (RM)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
              className="input w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Target date (optional)</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="input w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Already saved (RM)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="input w-full"
            />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Saving..." : "Add goal"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
