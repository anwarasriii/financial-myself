import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bills = await prisma.recurringBill.findMany({
    where: { userId },
    include: { bucket: true },
    orderBy: { dueDay: "asc" },
  });

  return NextResponse.json(bills);
}

const BillSchema = z.object({
  bucketId: z.string().min(1),
  name: z.string().trim().min(1),
  amount: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BillSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  const bucket = await prisma.bucket.findFirst({ where: { id: data.bucketId, userId } });
  if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });

  const bill = await prisma.recurringBill.create({
    data: { userId, bucketId: data.bucketId, name: data.name, amount: data.amount, dueDay: data.dueDay },
  });

  return NextResponse.json(bill, { status: 201 });
}
