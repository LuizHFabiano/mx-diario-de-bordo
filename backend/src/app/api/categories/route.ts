import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction } from "@/generated/prisma/client";
import { requireAdmin, requireAuthenticated } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const categorySchema = z.object({ name: z.string().trim().min(1).max(100), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/) });

export async function GET() {
  const { response } = await requireAuthenticated();
  if (response) return response;
  return NextResponse.json({ categories: await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }) });
}

export async function POST(request: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const data = categorySchema.safeParse(await request.json().catch(() => null));
  if (!data.success) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  try {
    const category = await prisma.category.create({ data: data.data });
    await prisma.auditLog.create({ data: { actorId: session.userId, action: AuditAction.CATEGORY_CREATED, entityType: "category", entityId: category.id } });
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
  }
}
