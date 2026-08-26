"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProgressUpdateControl({
  endpoint,
  field,
  initialValue,
}: {
  endpoint: string;
  field: "currentSaved" | "currentAmount";
  initialValue: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialValue));
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: Number(value) }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input input-xs w-20"
      />
      <button type="submit" disabled={pending} className="btn btn-xs btn-ghost">
        Save
      </button>
    </form>
  );
}
