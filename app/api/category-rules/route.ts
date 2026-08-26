import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.categoryRule.findMany({
    where: { userId },
    include: { bucket: true },
    orderBy: { keyword: "asc" },
  });

  return NextResponse.json(rules);
}

const RuleSchema = z.object({
  bucketId: z.string().min(1),
  keyword: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RuleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  const bucket = await prisma.bucket.findFirst({ where: { id: parsed.data.bucketId, userId } });
  if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });

  const rule = await prisma.categoryRule.create({
    data: { userId, bucketId: parsed.data.bucketId, keyword: parsed.data.keyword.toLowerCase() },
  });

  return NextResponse.json(rule, { status: 201 });
}
