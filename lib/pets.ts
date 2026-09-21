import { prisma } from "@/lib/prisma";

export async function getGoalProgress(userId: string): Promise<{
  ratio: number;
  totalSaved: number;
  totalTarget: number;
  goalCount: number;
}> {
  const goals = await prisma.goal.findMany({ where: { bucket: { userId } } });
  if (goals.length === 0) {
    return { ratio: 0, totalSaved: 0, totalTarget: 0, goalCount: 0 };
  }
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const ratio = totalTarget > 0 ? totalSaved / totalTarget : 0;
  return { ratio, totalSaved, totalTarget, goalCount: goals.length };
}

export { PET_INFO, moodFromRatio } from "@/lib/pet-meta";
export type { PetMood } from "@/lib/pet-meta";
