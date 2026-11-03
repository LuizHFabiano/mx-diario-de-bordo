import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/generated/prisma/client";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(9).max(256),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A nova senha deve ter entre 9 e 256 caracteres." },
      { status: 400 },
    );
  }

  const validCurrentPassword = await argon2.verify(
    session.user.passwordHash,
    parsed.data.currentPassword,
  );
  if (!validCurrentPassword) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json(
      { error: "A nova senha deve ser diferente da senha atual." },
      { status: 400 },
    );
  }

  const passwordHash = await argon2.hash(parsed.data.newPassword, {
    type: argon2.argon2id,
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: AuditAction.PASSWORD_CHANGED,
        entityType: "user",
        entityId: session.userId,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
