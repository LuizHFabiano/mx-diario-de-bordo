import { PrismaClient } from '../src/generated/prisma/index.js';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const funcionarios = [
  // Turno Manhã
  { name: 'Djefferson', username: 'djefferson' },
  { name: 'Djonattan', username: 'djonattan' },
  { name: 'Vitor', username: 'vitor' },
  { name: 'Luigi', username: 'luigi' },
  { name: 'Luiz S.', username: 'luiz.s' },
  { name: 'Maria G.', username: 'maria.g' },
  { name: 'Paulo H.', username: 'paulo.h' },
  { name: 'Pietro', username: 'pietro' },

  // Turno Tarde
  { name: 'Felipe P.', username: 'felipe.p' },
  { name: 'Gabriel', username: 'gabriel' },
  { name: 'Guilherme', username: 'guilherme' },
  { name: 'João Pedro', username: 'joao.pedro' },
  { name: 'Kauê', username: 'kaue' },
  { name: 'Leonardo M.', username: 'leonardo.m' },
  { name: 'Yuri', username: 'yuri' },

  // Turno Noite
  { name: 'Allan', username: 'allan' },
  { name: 'Enerdan', username: 'enerdan' },
  { name: 'Lucas', username: 'lucas' },
  { name: 'Miguel', username: 'miguel' },
  { name: 'Natan', username: 'natan' },
  { name: 'Victor', username: 'victor' },
];

async function main() {
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '@Luiz22052212345';
  const hashedPassword = await argon2.hash(adminPassword);

  console.log('🔄 Cadastrando usuário Administrador...');
  await prisma.user.upsert({
    where: { username: process.env.INITIAL_ADMIN_USERNAME || 'admin' },
    update: {},
    create: {
      name: process.env.INITIAL_ADMIN_NAME || 'Administrador',
      username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('🔄 Cadastrando os 21 funcionários...');
  for (const func of funcionarios) {
    await prisma.user.upsert({
      where: { username: func.username },
      update: { name: func.name },
      create: {
        name: func.name,
        username: func.username,
        password: hashedPassword,
        role: 'ATENDENTE',
      },
    });
    console.log(`✓ Cadastrado: ${func.name} (${func.username})`);
  }

  console.log('\n✅ Todos os usuários foram cadastrados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });