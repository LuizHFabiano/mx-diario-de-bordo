-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('WORK', 'OFF', 'MEDICAL', 'ABSENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fixed_days_off" TEXT[] DEFAULT ARRAY['sunday']::TEXT[];

-- CreateTable
CREATE TABLE "work_scales" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "team_id" UUID,
    "shift" "ShiftType" NOT NULL DEFAULT 'MORNING',
    "week_start" DATE NOT NULL,
    "monday" "ScheduleStatus" NOT NULL DEFAULT 'WORK',
    "tuesday" "ScheduleStatus" NOT NULL DEFAULT 'WORK',
    "wednesday" "ScheduleStatus" NOT NULL DEFAULT 'WORK',
    "thursday" "ScheduleStatus" NOT NULL DEFAULT 'WORK',
    "friday" "ScheduleStatus" NOT NULL DEFAULT 'WORK',
    "saturday" "ScheduleStatus" NOT NULL DEFAULT 'WORK',
    "sunday" "ScheduleStatus" NOT NULL DEFAULT 'OFF',
    "monday_notes" TEXT,
    "tuesday_notes" TEXT,
    "wednesday_notes" TEXT,
    "thursday_notes" TEXT,
    "friday_notes" TEXT,
    "saturday_notes" TEXT,
    "sunday_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_scales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_scales_user_id_week_start_key" ON "work_scales"("user_id", "week_start");

-- AddForeignKey
ALTER TABLE "work_scales" ADD CONSTRAINT "work_scales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
