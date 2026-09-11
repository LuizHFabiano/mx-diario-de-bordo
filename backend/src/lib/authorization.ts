import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { getCurrentSession } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getCurrentSession();
  if (!session) {
    return { session: null, response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  if (session.user.role !== Role.ADMIN) {
    return { session: null, response: NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 }) };
  }
  return { session, response: null };
}

export async function requireAuthenticated() {
  const session = await getCurrentSession();
  if (!session) {
    return { session: null, response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { session, response: null };
}
