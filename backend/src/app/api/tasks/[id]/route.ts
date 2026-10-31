import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction, WorkDayStatus } from "@/generated/prisma/client";
import { requireAuthenticated } from "@/lib/authorization";
import { canWriteTask, toDateTime } from "@/lib/diary";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  start: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  end: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

async function getTask(id: string) {
  return prisma.task.findUnique({ where: { id }, include: { workDay: true } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requireAuthenticated();
  if (response || !session) return response!;
  const { id } = await params;
  const data = patchSchema.safeParse(await request.json().catch(() => null));
  if (!data.success)
    return NextResponse.json(
      { error: "Dados da atividade inválidos." },
      { status: 400 },
    );
  const task = await getTask(id);
  if (!task)
    return NextResponse.json(
      { error: "Atividade não encontrada." },
      { status: 404 },
    );
  if (task.workDay.status === WorkDayStatus.CLOSED)
    return NextResponse.json(
      { error: "Este diário foi encerrado." },
      { status: 409 },
    );
  if (!(await canWriteTask(session.user, task)))
    return NextResponse.json(
      { error: "Sem permissão para alterar esta atividade." },
      { status: 403 },
    );
  const start =
    data.data.start ??
    task.startedAt.toLocaleTimeString("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
  const end =
    data.data.end === undefined
      ? task.endedAt
      : data.data.end
        ? toDateTime(
            task.workDay.date.toISOString().slice(0, 10),
            data.data.end,
          )
        : null;
  if (
    end &&
    end <= toDateTime(task.workDay.date.toISOString().slice(0, 10), start)
  )
    return NextResponse.json(
      { error: "O término deve ser depois do início." },
      { status: 400 },
    );
  const { start: _start, end: _end, ...updateData } = data.data;
  await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: {
        ...updateData,
        startedAt: toDateTime(
          task.workDay.date.toISOString().slice(0, 10),
          start,
        ),
        endedAt: end,
        lastEditedById: session.userId,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: AuditAction.TASK_UPDATED,
        entityType: "task",
        entityId: id,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requireAuthenticated();
  if (response || !session) return response!;
  const { id } = await params;
  const task = await getTask(id);
  if (!task)
    return NextResponse.json(
      { error: "Atividade não encontrada." },
      { status: 404 },
    );
  if (task.workDay.status === WorkDayStatus.CLOSED)
    return NextResponse.json(
      { error: "Este diário foi encerrado." },
      { status: 409 },
    );
  if (!(await canWriteTask(session.user, task)))
    return NextResponse.json(
      { error: "Sem permissão para excluir esta atividade." },
      { status: 403 },
    );
  await prisma.$transaction([
    prisma.task.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: AuditAction.TASK_DELETED,
        entityType: "task",
        entityId: id,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
