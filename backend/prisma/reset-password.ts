import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { AuditAction, PrismaClient } from "../src/generated/prisma/client";

const username = process.env.RESET_USERNAME?.trim().toLowerCase();
const password = process.env.RESET_PASSWORD;
const connectionString = process.env.DATABASE_URL;

if (!username || !password || !connectionString) {
  throw new Error("Defina RESET_USERNAME, RESET_PASSWORD e DATABASE_URL antes de executar este script.");
}
if (password.length < 9) {
  throw new Error("RESET_PASSWORD deve ter ao menos 9 caracteres.");
}
const resetPassword = password;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error("Usuário não encontrado.");

    const passwordHash = await argon2.hash(resetPassword, { type: argon2.argon2id });
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.auditLog.create({
        data: {
          action: AuditAction.USER_UPDATED,
          entityType: "user",
          entityId: user.id,
          metadata: { source: "local-password-recovery" },
        },
      }),
    ]);

    console.log(`Senha redefinida para o usuário ${user.username}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
