import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction, Role, WorkDayStatus } from "@/generated/prisma/client";
import { requireAuthenticated } from "@/lib/authorization";
import { closePastWorkDays, toDateTime, userTeamIds } from "@/lib/diary";
import { prisma } from "@/lib/prisma";

const taskSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  teamId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).optional(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const { session, response } = await requireAuthenticated();
  if (response || !session) return response!;
  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.success && parsed.data.end && parsed.data.end <= parsed.data.start)) {
    return NextResponse.json({ error: "Dados da atividade inválidos." }, { status: 400 });
  }
  const data = parsed.data;
  await closePastWorkDays();
  if (session.user.role !== Role.ADMIN && !(await userTeamIds(session.userId)).includes(data.teamId)) {
    return NextResponse.json({ error: "Você não pertence a essa equipe." }, { status: 403 });
  }
  if (data.categoryId && !(await prisma.category.findFirst({ where: { id: data.categoryId, isActive: true } }))) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  }

  const workDay = await prisma.workDay.upsert({
    where: { teamId_date: { teamId: data.teamId, date: new Date(`${data.date}T00:00:00.000Z`) } },
    update: {},
    create: { teamId: data.teamId, date: new Date(`${data.date}T00:00:00.000Z`) },
  });
  if (workDay.status === WorkDayStatus.CLOSED) return NextResponse.json({ error: "Este diário foi encerrado." }, { status: 409 });
  const task = await prisma.task.create({
    data: {
      workDayId: workDay.id, teamId: data.teamId, createdById: session.userId,
      title: data.title, description: data.description || null, categoryId: data.categoryId || null,
      startedAt: toDateTime(data.date, data.start), endedAt: data.end ? toDateTime(data.date, data.end) : null,
    },
  });
  await prisma.auditLog.create({ data: { actorId: session.userId, action: AuditAction.TASK_CREATED, entityType: "task", entityId: task.id } });
  return NextResponse.json({ task: { id: task.id } }, { status: 201 });
}
