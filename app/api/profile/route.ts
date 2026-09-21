import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const ProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  age: z.number().int().min(0).max(150).nullable().optional(),
  avatarUrl: z
    .string()
    .startsWith("data:image/")
    .max(2_000_000, "Image is too large")
    .nullable()
    .optional(),
});

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ProfileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const { name, age, avatarUrl } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      age: age ?? null,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    age: updated.age,
    avatarUrl: updated.avatarUrl,
  });
}
