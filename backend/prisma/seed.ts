import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { AuditAction, PrismaClient, Role } from "../src/generated/prisma/client";

const requiredEnvironment = [
  "INITIAL_ADMIN_NAME",
  "INITIAL_ADMIN_USERNAME",
  "INITIAL_ADMIN_PASSWORD",
] as const;

function getRequiredEnvironment(name: (typeof requiredEnvironment)[number]) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} precisa ser definido antes de executar o seed.`);
  }
  return value;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não foi configurada.");

  const adminName = getRequiredEnvironment("INITIAL_ADMIN_NAME");
  const adminUsername = getRequiredEnvironment("INITIAL_ADMIN_USERNAME").toLowerCase();
  const adminPassword = getRequiredEnvironment("INITIAL_ADMIN_PASSWORD");

  if (adminPassword.length < 14) {
    throw new Error("INITIAL_ADMIN_PASSWORD deve ter ao menos 14 caracteres.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { username: adminUsername },
    });

    const admin =
      existingAdmin ??
      (await prisma.user.create({
        data: {
          name: adminName,
          username: adminUsername,
          passwordHash: await argon2.hash(adminPassword, {
            type: argon2.argon2id,
          }),
          role: Role.ADMIN,
        },
      }));

    if (!existingAdmin) {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: AuditAction.USER_CREATED,
          entityType: "user",
          entityId: admin.id,
          metadata: { source: "seed", role: Role.ADMIN },
        },
      });
    }

    for (const team of [
      { name: "Suporte", code: "SUPORTE" },
      { name: "Financeiro", code: "FINANCEIRO" },
    ]) {
      await prisma.team.upsert({
        where: { code: team.code },
        update: {},
        create: team,
      });
    }

    await prisma.category.upsert({
      where: { name: "PoP" },
      update: {},
      create: { name: "PoP", color: "#E5484D" },
    });

    await prisma.systemSetting.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    });

    console.log(`Seed concluído. Administrador: ${admin.username}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
