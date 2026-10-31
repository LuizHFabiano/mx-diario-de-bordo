import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const turnosData = [
  {
    nomeEquipe: 'Manhã',
    membros: [
      'Djefferson',
      'Djonattan',
      'Vitor',
      'Luigi',
      'Luiz S.',
      'Maria G.',
      'Paulo H.',
      'Pietro',
    ],
  },
  {
    nomeEquipe: 'Tarde',
    membros: [
      'Felipe P.',
      'Gabriel',
      'Guilherme',
      'João Pedro',
      'Kauê',
      'Leonardo M',
      'Yuri',
    ],
  },
  {
    nomeEquipe: 'Noite',
    membros: [
      'Allan',
      'Enerdan',
      'Lucas',
      'Miguel',
      'Natan',
      'Victor',
    ],
  },
];

function gerarUsername(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
}

async function main() {
  console.log('🚀 Iniciando cadastro de equipes e funcionários...');

  const senhaPadrao = 'Mudar@123';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(senhaPadrao, saltRounds);

  for (const turno of turnosData) {
    const team = await prisma.team.upsert({
      where: { name: turno.nomeEquipe },
      update: {},
      create: {
        name: turno.nomeEquipe,
        description: `Turno da ${turno.nomeEquipe}`,
      },
    });

    console.log(`\n📌 Equipe: ${team.name}`);

    for (const nome of turno.membros) {
      const username = gerarUsername(nome);

      const user = await prisma.user.upsert({
        where: { username },
        update: {
          teamId: team.id,
        },
        create: {
          name: nome,
          username: username,
          passwordHash: passwordHash,
          role: 'ATTENDANT',
          mustChangePassword: true,
          isActive: true,
          teamId: team.id,
        },
      });

      console.log(`  ✅ Funcionário: ${user.name} | Usuário: ${user.username} | Equipe: ${team.name}`);
    }
  }

  console.log('\n✨ Todos os funcionários foram cadastrados com sucesso!');
  console.log('🔑 Senha inicial: Mudar@123');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
