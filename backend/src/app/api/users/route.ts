import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar usuários', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isActive, role } = body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(role !== undefined && { role }),
      },
      select: { id: true, username: true, name: true, role: true, isActive: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar usuário', details: error.message }, { status: 500 });
  }
}
