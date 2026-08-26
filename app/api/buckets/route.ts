import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getBucketBalances } from "@/lib/finance";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [buckets, balances] = await Promise.all([
    prisma.bucket.findMany({
      where: { userId },
      include: {
        account: true,
        sinkingFundItems: true,
        goals: { orderBy: { rank: "asc" } },
        recurringBills: { where: { active: true } },
      },
      orderBy: { priority: "asc" },
    }),
    getBucketBalances(userId),
  ]);

  const result = buckets.map((b) => ({ ...b, balance: balances.get(b.id) ?? 0 }));

  return NextResponse.json(result);
}

const BucketSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().trim().min(1),
  kind: z.enum([
    "DAILY_USE",
    "BILLS",
    "ENTERTAINMENT",
    "EMERGENCY_FUND",
    "SINKING_FUND",
    "GOAL",
    "DEBT",
    "OTHER",
  ]),
  priority: z.number().int().default(0),
  targetAmount: z.number().positive().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BucketSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const bucket = await prisma.bucket.create({
    data: {
      userId,
      accountId: parsed.data.accountId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      priority: parsed.data.priority,
      targetAmount: parsed.data.targetAmount ?? undefined,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined,
    },
  });

  return NextResponse.json(bucket, { status: 201 });
}
