"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PetType } from "@/app/generated/prisma/client";
import { PET_INFO } from "@/lib/pet-meta";

const PET_TYPES: PetType[] = ["DOG", "CAT", "CHICKEN"];

export function PetPicker({
  initialPetType,
  initialPetName,
  onSaved,
}: {
  initialPetType: PetType | null;
  initialPetName: string | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [petType, setPetType] = useState<PetType | null>(initialPetType);
  const [petName, setPetName] = useState(initialPetName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!petType) return;
    setError(null);
    setPending(true);
    const res = await fetch("/api/pet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petType, petName: petName || null }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Couldn't save your pet.");
      return;
    }
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {PET_TYPES.map((type) => {
          const info = PET_INFO[type];
          const selected = petType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setPetType(type)}
              className={`flex flex-col items-center gap-2 rounded-box border p-3 transition ${
                selected ? "border-primary bg-primary/10" : "border-base-300 hover:border-base-content/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={info.image} alt={info.label} className="h-16 w-16 rounded-full object-cover" />
              <span className="text-sm font-medium">{info.label}</span>
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Pet name</span>
        <input
          value={petName}
          onChange={(e) => setPetName(e.target.value)}
          placeholder="Give your pet a name (optional)"
          className="input w-full max-w-xs"
        />
      </label>

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={pending || !petType}
        className="btn btn-primary btn-sm w-fit"
      >
        {pending ? "Saving..." : initialPetType ? "Change pet" : "Adopt pet"}
      </button>
    </form>
  );
}
