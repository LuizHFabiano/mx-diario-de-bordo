-- Adiciona novos status na escala sem alterar dados existentes
ALTER TYPE "ScheduleStatus" ADD VALUE IF NOT EXISTS 'HOLIDAY';
ALTER TYPE "ScheduleStatus" ADD VALUE IF NOT EXISTS 'DAY_OFF';

-- Adiciona datas opcionais de admissão e desligamento no usuário
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "admission_date" DATE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termination_date" DATE;

-- Tabela para persistir o estado completo do módulo de escalas no PostgreSQL
CREATE TABLE IF NOT EXISTS "work_scale_states" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'global',
    "payload" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_scale_states_pkey" PRIMARY KEY ("id")
);