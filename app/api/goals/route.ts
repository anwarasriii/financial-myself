import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { bucket: { userId } },
    include: { bucket: true },
    orderBy: { rank: "asc" },
  });

  return NextResponse.json(goals);
}

const GoalSchema = z.object({
  bucketId: z.string().min(1),
  name: z.string().trim().min(1),
  targetAmount: z.number().positive(),
  targetDate: z.string().datetime().nullable().optional(),
  currentAmount: z.number().min(0).default(0),
  rank: z.number().int().default(0),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = GoalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  const bucket = await prisma.bucket.findFirst({ where: { id: data.bucketId, userId } });
  if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });

  const goal = await prisma.goal.create({
    data: {
      bucketId: data.bucketId,
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      currentAmount: data.currentAmount,
      rank: data.rank,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
