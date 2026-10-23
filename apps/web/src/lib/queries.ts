// Consultas compartilhadas do painel (sempre filtradas por tenant).
import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { schema as S, type DB } from "@/db";
import { fromLocal, monthRange, todayLocal } from "./format";

/** Uma fatura só fica "atrasada" a partir do dia seguinte ao vencimento. */
export const startOfToday = () => fromLocal(todayLocal(), "00:00");

export async function monthFinance(db: DB, tenantId: string, ym: string) {
  const { start, end } = monthRange(ym);
  const [inv] = await db
    .select({
      paid: sql<number>`coalesce(sum(case when ${S.invoices.status} = 'PAID' then ${S.invoices.amountCents} end), 0)::int`,
      open: sql<number>`coalesce(sum(case when ${S.invoices.status} in ('PENDING','OVERDUE') and ${S.invoices.dueDate} >= ${startOfToday()} then ${S.invoices.amountCents} end), 0)::int`,
      late: sql<number>`coalesce(sum(case when ${S.invoices.status} in ('PENDING','OVERDUE') and ${S.invoices.dueDate} < ${startOfToday()} then ${S.invoices.amountCents} end), 0)::int`,
      count: sql<number>`count(*) filter (where ${S.invoices.status} <> 'CANCELED')::int`,
    })
    .from(S.invoices)
    .where(and(eq(S.invoices.tenantId, tenantId), gte(S.invoices.dueDate, start), lt(S.invoices.dueDate, end)));
  const [led] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${S.ledgerEntries.type} = 'INCOME' then ${S.ledgerEntries.amountCents} end), 0)::int`,
      expense: sql<number>`coalesce(sum(case when ${S.ledgerEntries.type} = 'EXPENSE' then ${S.ledgerEntries.amountCents} end), 0)::int`,
    })
    .from(S.ledgerEntries)
    .where(and(eq(S.ledgerEntries.tenantId, tenantId), gte(S.ledgerEntries.date, start), lt(S.ledgerEntries.date, end)));
  return {
    billedPaid: Number(inv?.paid ?? 0),
    open: Number(inv?.open ?? 0),
    late: Number(inv?.late ?? 0),
    invoices: Number(inv?.count ?? 0),
    income: Number(led?.income ?? 0),
    expense: Number(led?.expense ?? 0),
  };
}

/** Receitas e despesas por mês (caixa), para o gráfico. */
export async function cashByMonth(db: DB, tenantId: string, months: string[]) {
  const { start } = monthRange(months[0]!);
  const { end } = monthRange(months.at(-1)!);
  const rows = await db
    .select({
      ym: sql<string>`to_char(${S.ledgerEntries.date} at time zone 'UTC' at time zone 'America/Sao_Paulo', 'YYYY-MM')`,
      type: S.ledgerEntries.type,
      total: sql<number>`sum(${S.ledgerEntries.amountCents})::int`,
    })
    .from(S.ledgerEntries)
    .where(and(eq(S.ledgerEntries.tenantId, tenantId), gte(S.ledgerEntries.date, start), lt(S.ledgerEntries.date, end)))
    .groupBy(sql`1`, S.ledgerEntries.type);
  return months.map((ym) => ({
    ym,
    income: Number(rows.find((r) => r.ym === ym && r.type === "INCOME")?.total ?? 0),
    expense: Number(rows.find((r) => r.ym === ym && r.type === "EXPENSE")?.total ?? 0),
  }));
}

export async function overdueInvoices(db: DB, tenantId: string, limit = 50) {
  return db
    .select({ invoice: S.invoices, student: S.students })
    .from(S.invoices)
    .innerJoin(S.students, eq(S.students.id, S.invoices.studentId))
    .where(and(eq(S.invoices.tenantId, tenantId), inArray(S.invoices.status, ["PENDING", "OVERDUE"]), lt(S.invoices.dueDate, startOfToday())))
    .orderBy(asc(S.invoices.dueDate))
    .limit(limit);
}

export async function sessionsBetween(db: DB, tenantId: string, from: Date, to: Date) {
  const sessions = await db
    .select()
    .from(S.classSessions)
    .where(and(eq(S.classSessions.tenantId, tenantId), gte(S.classSessions.startsAt, from), lt(S.classSessions.startsAt, to)))
    .orderBy(asc(S.classSessions.startsAt));
  const ids = sessions.map((s) => s.id);
  const atts = ids.length
    ? await db
        .select({ att: S.attendances, student: { id: S.students.id, name: S.students.name, phone: S.students.phone } })
        .from(S.attendances)
        .innerJoin(S.students, eq(S.students.id, S.attendances.studentId))
        .where(inArray(S.attendances.sessionId, ids))
    : [];
  return sessions.map((s) => ({ ...s, people: atts.filter((a) => a.att.sessionId === s.id) }));
}

export async function activeSubscription(db: DB, studentId: string) {
  const [row] = await db
    .select({ sub: S.subscriptions, plan: S.plans })
    .from(S.subscriptions)
    .innerJoin(S.plans, eq(S.plans.id, S.subscriptions.planId))
    .where(and(eq(S.subscriptions.studentId, studentId), inArray(S.subscriptions.status, ["ACTIVE", "PAUSED"])))
    .orderBy(desc(S.subscriptions.startDate))
    .limit(1);
  return row ?? null;
}

export function inviteUrl(slug: string, token: string) {
  const root = process.env.NEXT_PUBLIC_APP_URL ?? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"}`;
  return `${root}/convite/${token}`;
}

export function studentAppUrl(slug: string) {
  const root = process.env.NEXT_PUBLIC_APP_URL ?? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"}`;
  return `${root}/t/${slug}`;
}

/** Evolução de carga por exercício (maior carga de cada sessão). */
export async function loadProgress(db: DB, studentId: string) {
  const rows = await db
    .select({ set: S.workoutSetLogs, ex: { id: S.exercises.id, name: S.exercises.name, images: S.exercises.images } })
    .from(S.workoutSetLogs)
    .innerJoin(S.exercises, eq(S.exercises.id, S.workoutSetLogs.exerciseId))
    .where(eq(S.workoutSetLogs.studentId, studentId))
    .orderBy(asc(S.workoutSetLogs.createdAt))
    .limit(2000);
  const byEx = new Map<string, { id: string; name: string; images: string[] | null; sessions: { logId: string; date: Date; maxKg: number; reps: number | null; volume: number }[] }>();
  for (const { set, ex } of rows) {
    let e = byEx.get(ex.id);
    if (!e) byEx.set(ex.id, (e = { ...ex, sessions: [] }));
    let s = e.sessions.find((x) => x.logId === set.workoutLogId);
    if (!s) e.sessions.push((s = { logId: set.workoutLogId, date: set.createdAt, maxKg: 0, reps: null, volume: 0 }));
    const kg = set.loadKg == null ? 0 : Number(set.loadKg);
    if (kg >= s.maxKg) {
      s.maxKg = kg;
      s.reps = set.reps;
    }
    s.volume += kg * (set.reps ?? 0);
  }
  return [...byEx.values()]
    .map((e) => ({
      ...e,
      last: e.sessions.at(-1)!,
      best: Math.max(...e.sessions.map((s) => s.maxKg)),
      first: e.sessions[0]!,
    }))
    .sort((a, b) => b.last.date.getTime() - a.last.date.getTime());
}
