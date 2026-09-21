"use client";

import type { PetType } from "@/app/generated/prisma/client";
import { Modal } from "../Modal";
import { PetPicker } from "./PetPicker";

export function ChangePetModal({
  petType,
  petName,
}: {
  petType: PetType;
  petName: string | null;
}) {
  return (
    <Modal triggerLabel="Change pet" title="Change your pet">
      {(close) => <PetPicker initialPetType={petType} initialPetName={petName} onSaved={close} />}
    </Modal>
  );
}
