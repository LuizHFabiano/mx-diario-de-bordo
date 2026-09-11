import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, setSessionCookie } from "@/lib/auth";
import {
  clearFailedLogins,
  getClientKey,
  isLoginBlocked,
  recordFailedLogin,
} from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  if (isLoginBlocked(clientKey)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em 15 minutos." },
      { status: 429 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username.toLowerCase() },
  });
  const passwordMatches = user
    ? await argon2.verify(user.passwordHash, parsed.data.password)
    : false;

  if (!user || !user.isActive || !passwordMatches) {
    recordFailedLogin(clientKey);
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  clearFailedLogins(clientKey);
  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
  setSessionCookie(response, token, expiresAt);
  return response;
}
