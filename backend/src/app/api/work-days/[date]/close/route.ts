import { NextResponse } from "next/server";
import { Role, WorkDayStatus } from "@/generated/prisma/client";
import { requireAuthenticated } from "@/lib/authorization";
import { managedTeamIds } from "@/lib/diary";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ date: string }> }) {
  const { session, response } = await requireAuthenticated();
  if (response || !session) return response!;
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  if (session.user.role === Role.ATTENDANT) return NextResponse.json({ error: "Sem permissão para encerrar diários." }, { status: 403 });
  const teamIds = session.user.role === Role.ADMIN
    ? (await prisma.team.findMany({ where: { isActive: true }, select: { id: true } })).map(({ id }) => id)
    : await managedTeamIds(session.userId);
  const closedAt = new Date();
  for (const teamId of teamIds) {
    await prisma.workDay.upsert({
      where: { teamId_date: { teamId, date: new Date(`${date}T00:00:00.000Z`) } },
      update: { status: WorkDayStatus.CLOSED, closedAt, closedById: session.userId },
      create: { teamId, date: new Date(`${date}T00:00:00.000Z`), status: WorkDayStatus.CLOSED, closedAt, closedById: session.userId },
    });
  }
  return NextResponse.json({ ok: true });
}
