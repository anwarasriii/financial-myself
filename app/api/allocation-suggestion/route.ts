import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { computeAllocationSuggestion } from "@/lib/allocation-engine";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const incomeParam = searchParams.get("income");

  const suggestion = await computeAllocationSuggestion(userId, {
    incomeAmount: incomeParam ? Number(incomeParam) : undefined,
  });

  return NextResponse.json(suggestion);
}
