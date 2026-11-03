import { Role, WorkDayStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

function parts(date: Date) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(values.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
}

export function todayKey() {
  const value = parts(new Date());
  return `${value.year}-${value.month}-${value.day}`;
}

export function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function timeValue(value: Date) {
  const valueParts = parts(value);
  return `${valueParts.hour}:${valueParts.minute}`;
}

export function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`);
}

export async function closePastWorkDays() {
  return prisma.workDay.updateMany({
    where: { status: WorkDayStatus.OPEN, date: { lt: new Date(`${todayKey()}T00:00:00.000Z`) } },
    data: { status: WorkDayStatus.CLOSED, closedAt: new Date() },
  });
}

export async function userTeamIds(userId: string) {
  const memberships = await prisma.userTeam.findMany({ where: { userId }, select: { teamId: true } });
  return memberships.map(({ teamId }) => teamId);
}

export async function managedTeamIds(userId: string) {
  const teams = await prisma.teamManager.findMany({ where: { userId }, select: { teamId: true } });
  return teams.map(({ teamId }) => teamId);
}

export async function canWriteTask(user: { id: string; role: Role }, task: { createdById: string; teamId: string }) {
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.ATTENDANT) return task.createdById === user.id;
  if (task.createdById === user.id) return true;
  return (await managedTeamIds(user.id)).includes(task.teamId);
}
