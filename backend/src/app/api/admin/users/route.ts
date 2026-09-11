import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction, Role } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const DEFAULT_INITIAL_PASSWORD = "Mudar@123";

const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(9).max(256).optional(),
  role: z.enum([Role.ADMIN, Role.MANAGER, Role.ATTENDANT]),
  teamIds: z.array(z.string().uuid()).default([]),
  primaryTeamId: z.string().uuid().optional(),
  managedTeamIds: z.array(z.string().uuid()).default([]),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      memberships: { include: { team: true }, orderBy: { team: { name: "asc" } } },
      managedTeams: { include: { team: true }, orderBy: { team: { name: "asc" } } },
    },
  });

  return NextResponse.json({
    users: users.map(({ passwordHash: _, ...user }) => user),
  });
}

export async function POST(request: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;

  const payload = await request.json().catch(() => null);
  const parsed = userSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados do usuário inválidos.",
        fields: parsed.error.issues.map((issue) => issue.path.join(".")),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const username = data.username.toLowerCase();
  const teamIds = [...new Set(data.teamIds)];
  const managedTeamIds = [...new Set(data.managedTeamIds)];

  if (data.role !== Role.ADMIN && teamIds.length === 0) {
    return NextResponse.json({ error: "Atendentes e gestores precisam pertencer a uma equipe." }, { status: 400 });
  }
  if (data.primaryTeamId && !teamIds.includes(data.primaryTeamId)) {
    return NextResponse.json({ error: "A equipe principal deve pertencer ao usuário." }, { status: 400 });
  }
  if (managedTeamIds.some((teamId) => !teamIds.includes(teamId))) {
    return NextResponse.json({ error: "Um gestor deve pertencer às equipes que gerencia." }, { status: 400 });
  }
  if (managedTeamIds.length > 0 && data.role === Role.ATTENDANT) {
    return NextResponse.json({ error: "Atendentes não podem gerenciar equipes." }, { status: 400 });
  }

  const [existingUser, teams] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    prisma.team.findMany({ where: { id: { in: teamIds }, isActive: true }, select: { id: true } }),
  ]);
  if (existingUser) {
    return NextResponse.json({ error: "Este nome de usuário já existe." }, { status: 409 });
  }
  if (teams.length !== teamIds.length) {
    return NextResponse.json({ error: "Uma ou mais equipes são inválidas ou estão inativas." }, { status: 400 });
  }

  const initialPassword = data.password ?? DEFAULT_INITIAL_PASSWORD;
  const passwordHash = await argon2.hash(initialPassword, { type: argon2.argon2id });
  const primaryTeamId = data.primaryTeamId ?? teamIds[0];
  const userId = randomUUID();
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        name: data.name,
        username,
        passwordHash,
        mustChangePassword: data.password === undefined,
        role: data.role,
        memberships: {
          create: teamIds.map((teamId) => ({ teamId, isPrimary: teamId === primaryTeamId })),
        },
        managedTeams: {
          create: managedTeamIds.map((teamId) => ({ teamId })),
        },
      },
      include: {
        memberships: { include: { team: true } },
        managedTeams: { include: { team: true } },
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: AuditAction.USER_CREATED,
        entityType: "user",
        entityId: userId,
        metadata: { username, role: data.role, teamIds },
      },
    }),
  ]);

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json({ user: safeUser }, { status: 201 });
}
