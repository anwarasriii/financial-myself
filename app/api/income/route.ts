import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const income = await prisma.income.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 24,
  });

  return NextResponse.json(income);
}

const IncomeSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive(),
  source: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = IncomeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  const income = await prisma.income.create({
    data: { userId, date: new Date(data.date), amount: data.amount, source: data.source },
  });

  return NextResponse.json(income, { status: 201 });
}
