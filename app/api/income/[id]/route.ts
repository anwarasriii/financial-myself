import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const income = await prisma.income.findFirst({ where: { id, userId } });
  if (!income) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.income.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
