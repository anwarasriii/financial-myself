import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { parseStatement } from "@/lib/csv";
import { matchBucket } from "@/lib/categorize";

const PreviewSchema = z.object({
  csv: z.string().min(1),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PreviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  const result = parseStatement(parsed.data.csv);
  if (result.error) {
    return NextResponse.json({ error: { csv: [result.error] } }, { status: 400 });
  }

  const rules = await prisma.categoryRule.findMany({ where: { userId } });

  const rows = result.rows.map((row) => ({
    ...row,
    suggestedBucketId: matchBucket(row.description, rules),
  }));

  return NextResponse.json({ rows });
}
