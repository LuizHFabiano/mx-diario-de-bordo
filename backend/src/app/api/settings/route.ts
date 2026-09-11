import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireAuthenticated } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  dayStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  dayEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  allowManualClose: z.boolean().optional(),
});

export async function GET() {
  const { response } = await requireAuthenticated();
  if (response) return response;
  const settings = await prisma.systemSetting.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } });
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const data = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!data.success || (data.data.dayStart && data.data.dayEnd && data.data.dayEnd <= data.data.dayStart)) {
    return NextResponse.json({ error: "Configurações inválidas." }, { status: 400 });
  }
  const settings = await prisma.systemSetting.upsert({ where: { id: "global" }, update: data.data, create: { id: "global", ...data.data } });
  return NextResponse.json({ settings });
}
