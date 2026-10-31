import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction, Role } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  role: z.enum([Role.ADMIN, Role.MANAGER, Role.ATTENDANT]).optional(),
  isActive: z.boolean().optional(),
  teamIds: z.array(z.string().uuid()).optional(),
  primaryTeamId: z.string().uuid().nullable().optional(),
  managedTeamIds: z.array(z.string().uuid()).optional(),
  password: z.string().min(9).max(256).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados do usuário inválidos." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { memberships: true, managedTeams: true },
  });
  if (!existing) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const data = parsed.data;
  const username = data.username?.toLowerCase();
  if (username && username !== existing.username) {
    const userWithSameUsername = await prisma.user.findUnique({ where: { username } });
    if (userWithSameUsername) {
      return NextResponse.json({ error: "Este nome de usuário já existe." }, { status: 409 });
    }
  }
  const role = data.role ?? existing.role;
  const teamIds = [...new Set(data.teamIds ?? existing.memberships.map((membership) => membership.teamId))];
  const managedTeamIds = [
    ...new Set(data.managedTeamIds ?? existing.managedTeams.map((management) => management.teamId)),
  ];
  const primaryTeamId =
    data.primaryTeamId === undefined
      ? existing.memberships.find((membership) => membership.isPrimary)?.teamId ?? teamIds[0]
      : data.primaryTeamId ?? undefined;
  const isActive = data.isActive ?? existing.isActive;

  if (role !== Role.ADMIN && teamIds.length === 0) {
    return NextResponse.json({ error: "Atendentes e gestores precisam pertencer a uma equipe." }, { status: 400 });
  }
  if (primaryTeamId && !teamIds.includes(primaryTeamId)) {
    return NextResponse.json({ error: "A equipe principal deve pertencer ao usuário." }, { status: 400 });
  }
  if (managedTeamIds.some((teamId) => !teamIds.includes(teamId))) {
    return NextResponse.json({ error: "Um gestor deve pertencer às equipes que gerencia." }, { status: 400 });
  }
  if (managedTeamIds.length > 0 && role === Role.ATTENDANT) {
    return NextResponse.json({ error: "Atendentes não podem gerenciar equipes." }, { status: 400 });
  }

  if (existing.role === Role.ADMIN && existing.isActive && (role !== Role.ADMIN || !isActive)) {
    const activeAdmins = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } });
    if (activeAdmins <= 1) {
      return NextResponse.json({ error: "Não é permitido desativar ou rebaixar o último administrador ativo." }, { status: 400 });
    }
  }

  if (data.teamIds !== undefined) {
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds }, isActive: true },
      select: { id: true },
    });
    if (teams.length !== teamIds.length) {
      return NextResponse.json({ error: "Uma ou mais equipes são inválidas ou estão inativas." }, { status: 400 });
    }
  }

  const userUpdate = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(username !== undefined ? { username } : {}),
    ...(data.role !== undefined ? { role: data.role } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    ...(data.password !== undefined
      ? {
          passwordHash: await argon2.hash(data.password, { type: argon2.argon2id }),
          mustChangePassword: true,
        }
      : {}),
  };
  const user = await prisma.$transaction(async (tx) => {
    if (data.teamIds !== undefined) {
      await tx.userTeam.deleteMany({ where: { userId: id } });
      if (teamIds.length > 0) {
        await tx.userTeam.createMany({
          data: teamIds.map((teamId) => ({ userId: id, teamId, isPrimary: teamId === primaryTeamId })),
        });
      }
    }
    if (data.managedTeamIds !== undefined) {
      await tx.teamManager.deleteMany({ where: { userId: id } });
      if (managedTeamIds.length > 0) {
        await tx.teamManager.createMany({ data: managedTeamIds.map((teamId) => ({ userId: id, teamId })) });
      }
    }

    const updated = await tx.user.update({
      where: { id },
      data: userUpdate,
      include: { memberships: { include: { team: true } }, managedTeams: { include: { team: true } } },
    });
    if (data.password || data.isActive === false) {
      await tx.session.deleteMany({ where: { userId: id } });
    }
    await tx.auditLog.create({
      data: {
        actorId: session.userId,
        action: AuditAction.USER_UPDATED,
        entityType: "user",
        entityId: id,
        metadata: { updatedFields: Object.keys(data).filter((key) => key !== "password") },
      },
    });
    return updated;
  });

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;

  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json({ error: "Você não pode excluir a própria conta." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (existing.role === Role.ADMIN && existing.isActive) {
    const activeAdmins = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } });
    if (activeAdmins <= 1) {
      return NextResponse.json({ error: "Não é permitido excluir o último administrador ativo." }, { status: 400 });
    }
  }

  const [taskCount, closedDaysCount] = await Promise.all([
    prisma.task.count({ where: { OR: [{ createdById: id }, { lastEditedById: id }] } }),
    prisma.workDay.count({ where: { closedById: id } }),
  ]);
  if (taskCount > 0 || closedDaysCount > 0) {
    return NextResponse.json(
      {
        error:
          "Esta conta já tem histórico de atividades e não pode ser excluída. Bloqueie a conta para preservar o histórico.",
      },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.userTeam.deleteMany({ where: { userId: id } }),
    prisma.teamManager.deleteMany({ where: { userId: id } }),
    prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: AuditAction.USER_DELETED,
        entityType: "user",
        entityId: id,
        metadata: { deletedUsername: existing.username, deletedName: existing.name },
      },
    }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
