import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const bucketId = searchParams.get("bucketId") ?? undefined;

  const transactions = await prisma.transaction.findMany({
    where: { userId, ...(bucketId ? { bucketId } : {}) },
    include: { account: true, bucket: true },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

const TransactionSchema = z.object({
  accountId: z.string().min(1),
  bucketId: z.string().min(1).nullable().optional(),
  date: z.string().datetime(),
  amount: z.number().positive(),
  direction: z.enum(["IN", "OUT"]),
  category: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = TransactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  const account = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (data.bucketId) {
    const bucket = await prisma.bucket.findFirst({ where: { id: data.bucketId, userId } });
    if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId: data.accountId,
      bucketId: data.bucketId ?? undefined,
      date: new Date(data.date),
      amount: data.amount,
      direction: data.direction,
      category: data.category ?? undefined,
      note: data.note ?? undefined,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
