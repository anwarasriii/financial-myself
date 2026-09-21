import type { PetType } from "@/app/generated/prisma/client";

export const PET_INFO: Record<PetType, { label: string; image: string }> = {
  DOG: { label: "Dog", image: "/pets/dog.jpg" },
  CAT: { label: "Cat", image: "/pets/cat.avif" },
  CHICKEN: { label: "Chicken", image: "/pets/chicken.jpg" },
};

export type PetMood = "waiting" | "starting" | "content" | "happy" | "thriving";

const MOOD_LABELS: Record<PetMood, string> = {
  waiting: "Waiting for a goal",
  starting: "Just getting started",
  content: "Content",
  happy: "Happy",
  thriving: "Thriving",
};

export function moodFromRatio(ratio: number, goalCount: number): { mood: PetMood; label: string } {
  if (goalCount === 0) return { mood: "waiting", label: MOOD_LABELS.waiting };
  let mood: PetMood;
  if (ratio >= 1) mood = "thriving";
  else if (ratio >= 0.66) mood = "happy";
  else if (ratio >= 0.33) mood = "content";
  else mood = "starting";
  return { mood, label: MOOD_LABELS[mood] };
}
