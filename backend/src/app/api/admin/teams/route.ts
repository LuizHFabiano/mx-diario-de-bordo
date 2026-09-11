import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const teamSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(50).regex(/^[A-Z0-9_-]+$/),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { memberships: true, managers: true } },
    },
  });
  return NextResponse.json({ teams });
}

export async function POST(request: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;

  const payload = await request.json().catch(() => null);
  const parsed = teamSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nome ou código da equipe inválido." }, { status: 400 });
  }

  const name = parsed.data.name;
  const code = parsed.data.code.toUpperCase();
  const existing = await prisma.team.findFirst({
    where: { OR: [{ name }, { code }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Já existe uma equipe com esse nome ou código." }, { status: 409 });
  }

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({ data: { name, code } });
    await tx.auditLog.create({
      data: {
        actorId: session.userId,
        action: AuditAction.TEAM_CREATED,
        entityType: "team",
        entityId: created.id,
        metadata: { name: created.name, code: created.code },
      },
    });
    return created;
  });

  return NextResponse.json({ team }, { status: 201 });
}
