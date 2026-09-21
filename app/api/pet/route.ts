import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const PetSchema = z.object({
  petType: z.enum(["DOG", "CAT", "CHICKEN"]),
  petName: z.string().trim().max(50).nullable().optional(),
});

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const { petType, petName } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { petType, petName: petName || null },
  });

  return NextResponse.json({ petType: updated.petType, petName: updated.petName });
}
