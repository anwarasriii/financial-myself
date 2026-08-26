import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.sinkingFundItem.findMany({
    where: { bucket: { userId } },
    include: { bucket: true },
    orderBy: { dueMonth: "asc" },
  });

  return NextResponse.json(items);
}

const SinkingFundItemSchema = z.object({
  bucketId: z.string().min(1),
  name: z.string().trim().min(1),
  annualCost: z.number().positive(),
  dueMonth: z.number().int().min(1).max(12),
  currentSaved: z.number().min(0).default(0),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = SinkingFundItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  const bucket = await prisma.bucket.findFirst({ where: { id: data.bucketId, userId } });
  if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });

  const item = await prisma.sinkingFundItem.create({
    data: {
      bucketId: data.bucketId,
      name: data.name,
      annualCost: data.annualCost,
      dueMonth: data.dueMonth,
      currentSaved: data.currentSaved,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
