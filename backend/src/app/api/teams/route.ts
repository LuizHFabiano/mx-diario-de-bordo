import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, username: true, role: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(teams);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar equipes', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome da equipe é obrigatório' }, { status: 400 });
    }

    const generatedCode = (code || name)
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, '_');

    const team = await prisma.team.create({
      data: {
        name,
        code: generatedCode
      }
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao criar equipe', details: error.message }, { status: 500 });
  }
}