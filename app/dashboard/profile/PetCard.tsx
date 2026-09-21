import type { PetType } from "@/app/generated/prisma/client";
import { PET_INFO, moodFromRatio } from "@/lib/pet-meta";
import { formatMoney } from "@/lib/format";
import { ProgressBar } from "../ProgressBar";
import { PetPicker } from "./PetPicker";
import { ChangePetModal } from "./ChangePetModal";

export function PetCard({
  petType,
  petName,
  ratio,
  totalSaved,
  totalTarget,
  goalCount,
}: {
  petType: PetType | null;
  petName: string | null;
  ratio: number;
  totalSaved: number;
  totalTarget: number;
  goalCount: number;
}) {
  if (!petType) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-base-content/60">
          Adopt a companion &mdash; it grows happier as you make progress on your Goal buckets.
        </p>
        <PetPicker initialPetType={null} initialPetName={null} />
      </div>
    );
  }

  const info = PET_INFO[petType];
  const { label: moodLabel } = moodFromRatio(ratio, goalCount);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={info.image} alt={info.label} className="h-20 w-20 rounded-full object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">{petName || info.label}</span>
            <span className="badge badge-sm badge-primary">{moodLabel}</span>
          </div>
          <ProgressBar ratio={ratio} colorClass="progress-primary" />
          <span className="text-xs text-base-content/60">
            {goalCount > 0
              ? `${formatMoney(totalSaved)} / ${formatMoney(totalTarget)} saved toward your goals`
              : "Add a goal on your dashboard to start growing your pet"}
          </span>
        </div>
      </div>
      <ChangePetModal petType={petType} petName={petName} />
    </div>
  );
}
