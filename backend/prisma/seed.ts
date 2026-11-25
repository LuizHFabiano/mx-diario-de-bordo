import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import argon2 from 'argon2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
  const adminHash = await argon2.hash(adminPassword);

  // Senha padrão dos funcionários: 12345678
  const funcionarioPassword = '12345678';
  const funcionarioHash = await argon2.hash(funcionarioPassword);

  console.log('?? Cadastrando/Atualizando Administrador...');
  await prisma.user.upsert({
    where: { username: process.env.INITIAL_ADMIN_USERNAME || 'admin' },
    update: { passwordHash: adminHash },
    create: {
      name: process.env.INITIAL_ADMIN_NAME || 'Administrador',
      username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  console.log('?? Cadastrando/Atualizando os 21 funcionários com a senha 12345678...');
  for (const func of funcionarios) {
    await prisma.user.upsert({
      where: { username: func.username },
      update: { 
        name: func.name,
        passwordHash: funcionarioHash,
      },
      create: {
        name: func.name,
        username: func.username,
        passwordHash: funcionarioHash,
        role: 'ATTENDANT',
      },
    });
    console.log(`? Atualizado: ${func.name} (${func.username})`);
  }

  console.log('\n? Todos os funcionários agora têm a senha: 12345678');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
