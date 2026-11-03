import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticated } from "@/lib/authorization";
import { closePastWorkDays, dateKey, managedTeamIds, timeValue, userTeamIds } from "@/lib/diary";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const { session, response } = await requireAuthenticated();
  if (response || !session) return response!;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success || parsed.data.from > parsed.data.to) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }
  await closePastWorkDays();

  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.to}T00:00:00.000Z`);
  const [settings, categories, users, teams, workDays] = await Promise.all([
    prisma.systemSetting.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, username: true, role: true } }),
    prisma.team.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.workDay.findMany({
      where: { date: { gte: from, lte: to } },
      include: {
        tasks: { include: { category: true, createdBy: { select: { id: true, name: true, username: true } } }, orderBy: { startedAt: "asc" } },
      },
    }),
  ]);

  const days: Record<string, { closed: boolean; tasks: unknown[] }> = {};
  for (const workDay of workDays) {
    const key = dateKey(workDay.date);
    const day = days[key] ?? { closed: true, tasks: [] };
    day.closed = day.closed && workDay.status === "CLOSED";
    day.tasks.push(...workDay.tasks.map((task) => ({
      id: task.id,
      workDayId: workDay.id,
      teamId: task.teamId,
      title: task.title,
      description: task.description ?? "",
      start: timeValue(task.startedAt),
      end: task.endedAt ? timeValue(task.endedAt) : null,
      categoryId: task.categoryId,
      userId: task.createdBy.id,
      userEmail: task.createdBy.username,
      userName: task.createdBy.name,
      isEdited: task.lastEditedById !== null,
      editedAt: task.updatedAt.toISOString(),
    })));
    days[key] = day;
  }

  return NextResponse.json({
    settings: { dayStart: settings.dayStart, dayEnd: settings.dayEnd, allowManualClose: settings.allowManualClose },
    categories,
    users,
    teams,
    memberTeamIds: session.user.role === "ADMIN" ? teams.map(({ id }) => id) : await userTeamIds(session.userId),
    managedTeamIds: session.user.role === "ADMIN" ? teams.map(({ id }) => id) : await managedTeamIds(session.userId),
    days,
  });
}
