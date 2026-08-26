import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const CommitSchema = z.object({
  accountId: z.string().min(1),
  rows: z
    .array(
      z.object({
        date: z.string().datetime(),
        description: z.string(),
        amount: z.number().positive(),
        direction: z.enum(["IN", "OUT"]),
        bucketId: z.string().min(1).nullable(),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CommitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const { accountId, rows } = parsed.data;

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const bucketIds = [...new Set(rows.map((r) => r.bucketId).filter((id): id is string => !!id))];
  if (bucketIds.length > 0) {
    const ownedBuckets = await prisma.bucket.findMany({
      where: { id: { in: bucketIds }, userId },
      select: { id: true },
    });
    if (ownedBuckets.length !== bucketIds.length) {
      return NextResponse.json({ error: "One or more buckets not found" }, { status: 404 });
    }
  }

  const created = await prisma.transaction.createMany({
    data: rows.map((row) => ({
      userId,
      accountId,
      bucketId: row.bucketId,
      date: new Date(row.date),
      amount: row.amount,
      direction: row.direction,
      note: row.description,
    })),
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
