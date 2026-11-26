import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import argon2 from 'argon2';

// GET /api/admin/users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: { team: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar usuários', details: error.message }, { status: 500 });
  }
}

// POST /api/admin/users (Criar Conta com Argon2)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, role, teamIds, primaryTeamId } = body;

    if (!username) {
      return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
    }

    // Senha padrão inicial conforme definido no front: Mudar@123
    const defaultPassword = 'Mudar@123';
    const passwordHash = await argon2.hash(defaultPassword);

    const user = await prisma.user.create({
      data: {
        username,
        name: name || username,
        passwordHash,
        role: role || 'ATTENDANT',
        mustChangePassword: true,
        isActive: true,
      }
    });

    // Se houver equipes vinculadas
    if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
      for (const teamId of teamIds) {
        await prisma.userTeam.create({
          data: {
            userId: user.id,
            teamId: teamId,
            isPrimary: teamId === primaryTeamId
          }
        });
      }
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar usuário' }, { status: 500 });
  }
}
