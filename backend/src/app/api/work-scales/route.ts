import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import { ScheduleStatus, ShiftType } from '@/generated/prisma/client';

const STATUS_TO_DB: Record<string, ScheduleStatus> = {
  TRABALHO: 'WORK',
  FOLGA: 'OFF',
  FERIADO: 'HOLIDAY',
  ATESTADO: 'MEDICAL',
  DAY_OFF: 'DAY_OFF',
  FALTA: 'ABSENT',
};

const SHIFT_TO_DB: Record<string, ShiftType> = {
  Manhã: 'MORNING',
  Tarde: 'AFTERNOON',
  Noite: 'NIGHT',
};

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const state = await prisma.workScaleState.findUnique({
      where: { id: 'global' },
    });

    return NextResponse.json({
      data: state?.payload ?? null,
      updatedAt: state?.updatedAt ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao carregar escalas', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      turnosFuncionarios,
      setoresFuncionarios,
      vigenciaFuncionarios,
      escalas,
      observacoes,
      folgasFixas,
    } = body || {};

    const previousState = await prisma.workScaleState.findUnique({
      where: { id: 'global' },
    });
    const prevPayload = (previousState?.payload as Record<string, any>) || {};

    const isAdmin = session.user.role === 'ADMIN';
    const nextPayload = {
      turnosFuncionarios: isAdmin
        ? turnosFuncionarios
        : prevPayload.turnosFuncionarios ?? turnosFuncionarios,
      setoresFuncionarios: isAdmin
        ? setoresFuncionarios
        : prevPayload.setoresFuncionarios ?? setoresFuncionarios,
      vigenciaFuncionarios: isAdmin
        ? vigenciaFuncionarios
        : prevPayload.vigenciaFuncionarios ?? vigenciaFuncionarios,
      folgasFixas: isAdmin
        ? folgasFixas
        : prevPayload.folgasFixas ?? folgasFixas,
      escalas: escalas ?? prevPayload.escalas ?? {},
      observacoes: observacoes ?? prevPayload.observacoes ?? {},
    };

    const saved = await prisma.workScaleState.upsert({
      where: { id: 'global' },
      update: { payload: nextPayload },
      create: { id: 'global', payload: nextPayload },
    });

    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true },
    });
    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
    });

    const userByName = new Map(
      allUsers.map((u) => [u.name.trim().toLowerCase(), u])
    );
    const teamByName = new Map(
      teams.map((t) => [t.name.trim().toLowerCase(), t])
    );

    const turnoPorFunc = new Map<string, ShiftType>();
    if (Array.isArray(nextPayload.turnosFuncionarios)) {
      for (const turno of nextPayload.turnosFuncionarios) {
        const dbShift = SHIFT_TO_DB[turno.nome] || 'MORNING';
        for (const funcNome of turno.funcionarios || []) {
          turnoPorFunc.set(funcNome.trim().toLowerCase(), dbShift);
        }
      }
    }

    if (isAdmin && nextPayload.vigenciaFuncionarios) {
      for (const [nome, vig] of Object.entries<any>(nextPayload.vigenciaFuncionarios)) {
        const matchedUser = userByName.get(nome.trim().toLowerCase());
        if (matchedUser) {
          await prisma.user.update({
            where: { id: matchedUser.id },
            data: {
              admissionDate: vig?.admissao ? new Date(`${vig.admissao}T00:00:00.000Z`) : null,
              terminationDate: vig?.desligamento ? new Date(`${vig.desligamento}T00:00:00.000Z`) : null,
              fixedDaysOff: Array.isArray(nextPayload.folgasFixas?.[nome])
                ? nextPayload.folgasFixas[nome]
                : undefined,
            },
          });
        }
      }
    }

    if (nextPayload.escalas && typeof nextPayload.escalas === 'object') {
      for (const [semanaKey, funcsMap] of Object.entries<any>(nextPayload.escalas)) {
        if (!semanaKey.startsWith('semana_') || !funcsMap) continue;
        const isoWeek = semanaKey.replace('semana_', '');
        const weekStart = new Date(`${isoWeek}T00:00:00.000Z`);
        if (Number.isNaN(weekStart.getTime())) continue;

        for (const [funcNome, diasMap] of Object.entries<any>(funcsMap)) {
          const matchedUser = userByName.get(funcNome.trim().toLowerCase());
          if (!matchedUser) continue;

          const setorNome = nextPayload.setoresFuncionarios?.[funcNome] || 'Suporte';
          const matchedTeam = teamByName.get(setorNome.trim().toLowerCase());
          const obsSemana = nextPayload.observacoes?.[semanaKey]?.[funcNome] || {};

          const scaleData = {
            teamId: matchedTeam?.id ?? null,
            shift: turnoPorFunc.get(funcNome.trim().toLowerCase()) || 'MORNING',
            monday: STATUS_TO_DB[diasMap?.seg] || 'WORK',
            tuesday: STATUS_TO_DB[diasMap?.ter] || 'WORK',
            wednesday: STATUS_TO_DB[diasMap?.qua] || 'WORK',
            thursday: STATUS_TO_DB[diasMap?.qui] || 'WORK',
            friday: STATUS_TO_DB[diasMap?.sex] || 'WORK',
            saturday: STATUS_TO_DB[diasMap?.sab] || 'WORK',
            sunday: STATUS_TO_DB[diasMap?.dom] || 'OFF',
            mondayNotes: obsSemana.seg || null,
            tuesdayNotes: obsSemana.ter || null,
            wednesdayNotes: obsSemana.qua || null,
            thursdayNotes: obsSemana.qui || null,
            fridayNotes: obsSemana.sex || null,
            saturdayNotes: obsSemana.sab || null,
            sundayNotes: obsSemana.dom || null,
          };

          await prisma.workScale.upsert({
            where: {
              userId_weekStart: {
                userId: matchedUser.id,
                weekStart,
              },
            },
            update: scaleData,
            create: {
              userId: matchedUser.id,
              weekStart,
              ...scaleData,
            },
          });
        }
      }
    }

    return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao salvar escalas', details: error.message },
      { status: 500 }
    );
  }
}