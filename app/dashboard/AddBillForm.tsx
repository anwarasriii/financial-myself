"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

export function AddBillForm({ bucketId }: { bucketId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId, name, amount: Number(amount), dueDay: Number(dueDay) }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Couldn't save bill.");
      return;
    }
    setName("");
    setAmount("");
    setDueDay("1");
    close();
    router.refresh();
  }

  return (
    <Modal triggerLabel="+ Add bill" title="Add a recurring bill">
      {(close) => (
        <form onSubmit={(e) => submit(e, close)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Rent"
              className="input w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Amount (RM)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="input w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Due day of month</span>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              required
              className="input w-full"
            />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Saving..." : "Add bill"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
