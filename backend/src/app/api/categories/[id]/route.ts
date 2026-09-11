import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const categorySchema = z.object({ name: z.string().trim().min(1).max(100).optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  const data = categorySchema.safeParse(await request.json().catch(() => null));
  if (!data.success) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  try {
    const category = await prisma.category.update({ where: { id }, data: data.data });
    await prisma.auditLog.create({ data: { actorId: session.userId, action: AuditAction.CATEGORY_UPDATED, entityType: "category", entityId: id } });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Categoria não encontrada ou nome já utilizado." }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
  await prisma.category.update({ where: { id }, data: { isActive: false } });
  await prisma.auditLog.create({ data: { actorId: session.userId, action: AuditAction.CATEGORY_UPDATED, entityType: "category", entityId: id, metadata: { isActive: false } } });
  return NextResponse.json({ ok: true });
}
