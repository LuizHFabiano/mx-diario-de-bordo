import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ano = parseInt(searchParams.get("ano") || new Date().getFullYear().toString());
    const mes = parseInt(searchParams.get("mes") || (new Date().getMonth() + 1).toString());

    // Primeiro e último dia do mês selecionado
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59);

    // Buscar todas as escalas (WorkScale) dentro do intervalo do mês
    const escalas = await prisma.workScale.findMany({
      where: {
        weekStart: {
          gte: inicioMes,
          lte: fimMes,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // Mapear e contar o total de faltas (ABSENT) por operador
    const relatorioFaltas: Record<string, { id: string; nome: string; totalFaltas: number }> = {};
    const diasSemana = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

    escalas.forEach((escala) => {
      const userId = escala.userId;
      if (!relatorioFaltas[userId]) {
        relatorioFaltas[userId] = {
          id: userId,
          nome: escala.user.name,
          totalFaltas: 0,
        };
      }

      diasSemana.forEach((dia) => {
        if (escala[dia] === "ABSENT") {
          relatorioFaltas[userId].totalFaltas += 1;
        }
      });
    });

    return NextResponse.json({
      ano,
      mes,
      operadores: Object.values(relatorioFaltas),
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de faltas:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}