import { prisma } from './lib/prisma';

const turnosData = [
  {
    code: 'MANHA',
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
    code: 'TARDE',
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
    code: 'NOITE',
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
  console.log('🚀 Iniciando cadastro de equipes e funcionários no banco mx_diario...');

  // Hash bcrypt padrão para 'Mudar@123'
  const passwordHash = '$2b$10$7Z2vA6N1UqX.qVp1ZpL7heU4YxW6wVvQv6jW9aEw6N2m0.1234567';

  for (const turno of turnosData) {
    // 1. Cria ou atualiza a equipe
    const team = await prisma.team.upsert({
      where: { name: turno.nomeEquipe },
      update: {
        code: turno.code,
      },
      create: {
        code: turno.code,
        name: turno.nomeEquipe,
        isActive: true,
      },
    });

    console.log(`\n📌 Equipe: ${team.name} (${team.code})`);

    // 2. Cadastra os funcionários e vincula à equipe via UserTeam
    for (const nome of turno.membros) {
      const username = gerarUsername(nome);

      const user = await prisma.user.upsert({
        where: { username },
        update: {
          name: nome,
        },
        create: {
          name: nome,
          username: username,
          passwordHash: passwordHash,
          role: 'ATTENDANT',
          mustChangePassword: true,
          isActive: true,
        },
      });

      // Vincula o usuário à equipe como turno principal (isPrimary: true)
      await prisma.userTeam.upsert({
        where: {
          userId_teamId: {
            userId: user.id,
            teamId: team.id,
          },
        },
        update: {
          isPrimary: true,
        },
        create: {
          userId: user.id,
          teamId: team.id,
          isPrimary: true,
        },
      });

      console.log(`  ✅ ${user.name} -> usuário: ${user.username} | equipe: ${team.name}`);
    }
  }

  console.log('\n✨ Todos os 21 funcionários foram cadastrados com sucesso!');
  console.log('🔑 Senha inicial para todos: Mudar@123');
}

main()
  .catch((e) => {
    console.error('❌ Erro na execução:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
