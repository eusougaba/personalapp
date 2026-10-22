"use server";
// Ações do painel do personal. Toda leitura/escrita é filtrada pelo tenant do personal logado.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { schema } from "@/db";
import { requireOwner } from "@/lib/auth";
import { INTERVAL_MONTHS, fromLocal, id, monthRange, parseMoney, addDays } from "@/lib/format";

const S = schema;
const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const token = () => crypto.randomUUID().replace(/-/g, "");

async function audit(tenantId: string, userId: string, action: string, entity: string, entityId?: string, meta?: unknown) {
  const { db } = await requireOwner();
  await db.insert(S.auditLogs).values({ id: id(), tenantId, userId, action, entity, entityId, meta: meta ?? null });
}

// ───────────── Alunos ─────────────

export async function createStudent(form: FormData) {
  const { db, tenant, user } = await requireOwner();
  const name = str(form, "name");
  if (!name) redirect("/painel/alunos/novo?erro=nome");
  const studentId = id();
  const birth = str(form, "birthDate");
  await db.insert(S.students).values({
    id: studentId,
    tenantId: tenant.id,
    name: name!,
    email: str(form, "email")?.toLowerCase() ?? null,
    phone: str(form, "phone"),
    birthDate: birth ? fromLocal(birth) : null,
    goal: str(form, "goal"),
    notes: str(form, "notes"),
    status: "INVITED",
    inviteToken: token(),
  });
  const planId = str(form, "planId");
  if (planId) await subscribe(tenant.id, studentId, planId, form);
  await audit(tenant.id, user.id, "create", "Student", studentId);
  redirect(`/painel/alunos/${studentId}?criado=1`);
}

export async function updateStudent(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sid = String(form.get("id"));
  const birth = str(form, "birthDate");
  await db
    .update(S.students)
    .set({
      name: str(form, "name") ?? "Sem nome",
      email: str(form, "email")?.toLowerCase() ?? null,
      phone: str(form, "phone"),
      birthDate: birth ? fromLocal(birth) : null,
      goal: str(form, "goal"),
      notes: str(form, "notes"),
    })
    .where(and(eq(S.students.id, sid), eq(S.students.tenantId, tenant.id)));
  redirect(`/painel/alunos/${sid}?aba=dados&salvo=1`);
}

export async function setStudentStatus(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sid = String(form.get("id"));
  const status = String(form.get("status")) as "ACTIVE" | "PAUSED" | "INACTIVE";
  if (!["ACTIVE", "PAUSED", "INACTIVE"].includes(status)) return;
  await db.update(S.students).set({ status }).where(and(eq(S.students.id, sid), eq(S.students.tenantId, tenant.id)));
  revalidatePath(`/painel/alunos/${sid}`);
}

export async function deleteStudent(form: FormData) {
  const { db, tenant, user } = await requireOwner();
  const sid = String(form.get("id"));
  await db.delete(S.students).where(and(eq(S.students.id, sid), eq(S.students.tenantId, tenant.id)));
  await audit(tenant.id, user.id, "delete", "Student", sid);
  redirect("/painel/alunos?removido=1");
}

export async function regenerateInvite(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sid = String(form.get("id"));
  await db.update(S.students).set({ inviteToken: token() }).where(and(eq(S.students.id, sid), eq(S.students.tenantId, tenant.id)));
  revalidatePath(`/painel/alunos/${sid}`);
}

// ───────────── Planos e assinaturas ─────────────

async function subscribe(tenantId: string, studentId: string, planId: string, form: FormData) {
  const { db } = await requireOwner();
  const [plan] = await db.select().from(S.plans).where(and(eq(S.plans.id, planId), eq(S.plans.tenantId, tenantId)));
  if (!plan) return;
  const custom = parseMoney(form.get("price"));
  const price = custom > 0 ? custom : Math.round(plan.priceCents * (1 - (plan.discountPct ?? 0) / 100));
  const start = str(form, "startDate") ?? new Date().toISOString().slice(0, 10);
  const subId = id();
  await db
    .update(S.subscriptions)
    .set({ status: "CANCELED", endDate: new Date() })
    .where(and(eq(S.subscriptions.studentId, studentId), eq(S.subscriptions.tenantId, tenantId), eq(S.subscriptions.status, "ACTIVE")));
  await db.insert(S.subscriptions).values({
    id: subId,
    tenantId,
    studentId,
    planId,
    priceCents: price,
    startDate: fromLocal(start),
    endDate: plan.validityDays ? fromLocal(addDays(start, plan.validityDays)) : null,
    sessionsLeft: plan.type === "PACKAGE" ? plan.sessionsTotal : plan.type === "SINGLE" ? 1 : null,
  });
  if (form.get("firstInvoice") === "on") {
    const due = str(form, "firstDue") ?? start;
    await db.insert(S.invoices).values({
      id: id(),
      tenantId,
      studentId,
      subscriptionId: subId,
      description: plan.type === "RECURRING" || plan.type === "ONLINE" ? `${plan.name} · ${due.slice(5, 7)}/${due.slice(0, 4)}` : plan.name,
      amountCents: price,
      dueDate: fromLocal(due),
    });
  }
  await db.update(S.students).set({ status: sql`CASE WHEN ${S.students.status} = 'INVITED' THEN 'INVITED'::"StudentStatus" ELSE 'ACTIVE'::"StudentStatus" END` }).where(eq(S.students.id, studentId));
}

export async function assignPlan(form: FormData) {
  const { tenant } = await requireOwner();
  const sid = String(form.get("studentId"));
  const planId = String(form.get("planId"));
  await subscribe(tenant.id, sid, planId, form);
  redirect(`/painel/alunos/${sid}?aba=plano`);
}

export async function cancelSubscription(form: FormData) {
  const { db, tenant } = await requireOwner();
  const subId = String(form.get("id"));
  const sid = String(form.get("studentId"));
  await db
    .update(S.subscriptions)
    .set({ status: "CANCELED", endDate: new Date() })
    .where(and(eq(S.subscriptions.id, subId), eq(S.subscriptions.tenantId, tenant.id)));
  redirect(`/painel/alunos/${sid}?aba=plano`);
}

function planValues(form: FormData) {
  const type = (str(form, "type") ?? "RECURRING") as "RECURRING" | "PACKAGE" | "SINGLE" | "ONLINE";
  const recurring = type === "RECURRING" || type === "ONLINE";
  return {
    name: str(form, "name") ?? "Plano",
    description: str(form, "description"),
    type,
    priceCents: parseMoney(form.get("price")),
    interval: recurring ? ((str(form, "interval") ?? "MONTHLY") as "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY") : null,
    sessionsPerWeek: recurring ? int(form, "sessionsPerWeek") : null,
    sessionsTotal: type === "PACKAGE" ? int(form, "sessionsTotal") : null,
    validityDays: type === "PACKAGE" ? int(form, "validityDays") : null,
    dueDay: recurring ? Math.min(28, Math.max(1, int(form, "dueDay") ?? 10)) : null,
    discountPct: int(form, "discountPct"),
    lateFeePct: int(form, "lateFeePct"),
  };
}

export async function savePlan(form: FormData) {
  const { db, tenant } = await requireOwner();
  const pid = str(form, "id");
  const v = planValues(form);
  if (pid) await db.update(S.plans).set(v).where(and(eq(S.plans.id, pid), eq(S.plans.tenantId, tenant.id)));
  else await db.insert(S.plans).values({ id: id(), tenantId: tenant.id, ...v });
  redirect("/painel/planos?salvo=1");
}

export async function togglePlan(form: FormData) {
  const { db, tenant } = await requireOwner();
  const pid = String(form.get("id"));
  await db
    .update(S.plans)
    .set({ active: sql`NOT ${S.plans.active}` })
    .where(and(eq(S.plans.id, pid), eq(S.plans.tenantId, tenant.id)));
  revalidatePath("/painel/planos");
}

// ───────────── Cobranças e financeiro ─────────────

export async function createInvoice(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sid = String(form.get("studentId"));
  const amount = parseMoney(form.get("amount"));
  const due = str(form, "dueDate") ?? new Date().toISOString().slice(0, 10);
  if (amount <= 0) redirect(`/painel/alunos/${sid}?aba=financeiro&erro=valor`);
  const [st] = await db.select({ id: S.students.id }).from(S.students).where(and(eq(S.students.id, sid), eq(S.students.tenantId, tenant.id)));
  if (!st) redirect("/painel/alunos");
  await db.insert(S.invoices).values({
    id: id(),
    tenantId: tenant.id,
    studentId: sid,
    description: str(form, "description") ?? "Cobrança avulsa",
    amountCents: amount,
    dueDate: fromLocal(due),
    notes: str(form, "notes"),
  });
  const back = str(form, "back");
  redirect(back ?? `/painel/alunos/${sid}?aba=financeiro`);
}

export async function markInvoicePaid(form: FormData) {
  const { db, tenant, user } = await requireOwner();
  const iid = String(form.get("id"));
  const method = (str(form, "method") ?? "PIX") as "PIX" | "CREDIT_CARD" | "BOLETO" | "CASH" | "OTHER";
  const paidOn = str(form, "paidAt");
  const paidAt = paidOn ? fromLocal(paidOn) : new Date();
  const [inv] = await db.select().from(S.invoices).where(and(eq(S.invoices.id, iid), eq(S.invoices.tenantId, tenant.id)));
  if (inv && inv.status !== "PAID") {
    const [st] = await db.select({ name: S.students.name }).from(S.students).where(eq(S.students.id, inv.studentId));
    await db.transaction(async (tx) => {
      await tx.update(S.invoices).set({ status: "PAID", method, paidAt, manual: true, netCents: inv.amountCents }).where(eq(S.invoices.id, iid));
      await tx.insert(S.ledgerEntries).values({
        id: id(),
        tenantId: tenant.id,
        type: "INCOME",
        category: "Mensalidades",
        description: st?.name ?? inv.description,
        amountCents: inv.amountCents,
        date: paidAt,
        invoiceId: iid,
      });
    });
    await audit(tenant.id, user.id, "mark_paid", "Invoice", iid, { method });
  }
  const back = str(form, "back");
  if (back) redirect(back);
  revalidatePath("/painel", "layout");
}

export async function cancelInvoice(form: FormData) {
  const { db, tenant } = await requireOwner();
  const iid = String(form.get("id"));
  await db
    .update(S.invoices)
    .set({ status: "CANCELED" })
    .where(and(eq(S.invoices.id, iid), eq(S.invoices.tenantId, tenant.id), inArray(S.invoices.status, ["PENDING", "OVERDUE"])));
  const back = str(form, "back");
  if (back) redirect(back);
  revalidatePath("/painel", "layout");
}

/** Gera as mensalidades do mês para todas as assinaturas recorrentes ativas (sem duplicar). */
export async function generateMonthlyInvoices(form: FormData) {
  const { db, tenant } = await requireOwner();
  const ym = String(form.get("month"));
  const { start, end } = monthRange(ym);
  const subs = await db
    .select({ sub: S.subscriptions, plan: S.plans })
    .from(S.subscriptions)
    .innerJoin(S.plans, eq(S.plans.id, S.subscriptions.planId))
    .innerJoin(S.students, eq(S.students.id, S.subscriptions.studentId))
    .where(
      and(
        eq(S.subscriptions.tenantId, tenant.id),
        eq(S.subscriptions.status, "ACTIVE"),
        inArray(S.plans.type, ["RECURRING", "ONLINE"]),
        inArray(S.students.status, ["ACTIVE", "INVITED"]),
        lt(S.subscriptions.startDate, end),
      ),
    );
  const existing = await db
    .select({ subscriptionId: S.invoices.subscriptionId })
    .from(S.invoices)
    .where(and(eq(S.invoices.tenantId, tenant.id), gte(S.invoices.dueDate, start), lt(S.invoices.dueDate, end)));
  const has = new Set(existing.map((e) => e.subscriptionId));
  const [y, m] = ym.split("-").map(Number);
  let created = 0;
  for (const { sub, plan } of subs) {
    if (has.has(sub.id)) continue;
    const startYm = sub.startDate.toISOString().slice(0, 7);
    const [sy, sm] = startYm.split("-").map(Number);
    const diff = (y! - sy!) * 12 + (m! - sm!);
    const every = INTERVAL_MONTHS[plan.interval ?? "MONTHLY"] ?? 1;
    if (diff < 0 || diff % every !== 0) continue;
    const day = String(plan.dueDay ?? 10).padStart(2, "0");
    await db.insert(S.invoices).values({
      id: id(),
      tenantId: tenant.id,
      studentId: sub.studentId,
      subscriptionId: sub.id,
      description: `${plan.name} · ${String(m).padStart(2, "0")}/${y}`,
      amountCents: sub.priceCents,
      dueDate: fromLocal(`${ym}-${day}`),
    });
    created++;
  }
  redirect(`/painel/financeiro?mes=${ym}&geradas=${created}`);
}

export async function createLedgerEntry(form: FormData) {
  const { db, tenant } = await requireOwner();
  const type = str(form, "type") === "INCOME" ? "INCOME" : "EXPENSE";
  const amount = parseMoney(form.get("amount"));
  const date = str(form, "date") ?? new Date().toISOString().slice(0, 10);
  if (amount > 0) {
    await db.insert(S.ledgerEntries).values({
      id: id(),
      tenantId: tenant.id,
      type,
      category: str(form, "category") ?? (type === "INCOME" ? "Outras receitas" : "Outras despesas"),
      description: str(form, "description"),
      amountCents: amount,
      date: fromLocal(date),
    });
  }
  redirect(`/painel/financeiro?mes=${date.slice(0, 7)}&aba=lancamentos`);
}

export async function deleteLedgerEntry(form: FormData) {
  const { db, tenant } = await requireOwner();
  await db.delete(S.ledgerEntries).where(and(eq(S.ledgerEntries.id, String(form.get("id"))), eq(S.ledgerEntries.tenantId, tenant.id)));
  revalidatePath("/painel/financeiro");
}

// ───────────── Agenda ─────────────

export async function createSessions(form: FormData) {
  const { db, tenant } = await requireOwner();
  const studentIds = form.getAll("studentIds").map(String).filter(Boolean);
  const date = str(form, "date") ?? new Date().toISOString().slice(0, 10);
  const time = str(form, "time") ?? "07:00";
  const minutes = int(form, "duration") ?? 60;
  const weeks = Math.min(26, Math.max(1, int(form, "repeatWeeks") ?? 1));
  const valid = studentIds.length
    ? (await db.select({ id: S.students.id }).from(S.students).where(and(eq(S.students.tenantId, tenant.id), inArray(S.students.id, studentIds)))).map((s) => s.id)
    : [];
  const series = weeks > 1 ? id() : null;
  for (let w = 0; w < weeks; w++) {
    const day = addDays(date, w * 7);
    const startsAt = fromLocal(day, time);
    const sessId = id();
    await db.insert(S.classSessions).values({
      id: sessId,
      tenantId: tenant.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + minutes * 60_000),
      location: str(form, "location"),
      online: form.get("online") === "on",
      title: str(form, "title") ?? "Treino personalizado",
      recurrence: series,
    });
    if (valid.length) await db.insert(S.attendances).values(valid.map((sid) => ({ id: id(), sessionId: sessId, studentId: sid })));
  }
  redirect(`/painel/agenda?semana=${date}`);
}

export async function setAttendance(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sessionId = String(form.get("sessionId"));
  const studentId = String(form.get("studentId"));
  const present = String(form.get("present")) === "1";
  const [sess] = await db.select().from(S.classSessions).where(and(eq(S.classSessions.id, sessionId), eq(S.classSessions.tenantId, tenant.id)));
  if (!sess) return;
  const [att] = await db.select().from(S.attendances).where(and(eq(S.attendances.sessionId, sessionId), eq(S.attendances.studentId, studentId)));
  const wasPresent = att?.present === true;
  await db.update(S.attendances).set({ present }).where(and(eq(S.attendances.sessionId, sessionId), eq(S.attendances.studentId, studentId)));
  // Pacotes: desconta/devolve aula do saldo
  if (present !== wasPresent) {
    await db
      .update(S.subscriptions)
      .set({ sessionsLeft: sql`GREATEST(0, ${S.subscriptions.sessionsLeft} ${present ? sql`- 1` : sql`+ 1`})` })
      .where(and(eq(S.subscriptions.studentId, studentId), eq(S.subscriptions.status, "ACTIVE"), sql`${S.subscriptions.sessionsLeft} IS NOT NULL`));
  }
  await db.update(S.classSessions).set({ status: "DONE" }).where(and(eq(S.classSessions.id, sessionId), eq(S.classSessions.status, "SCHEDULED")));
  revalidatePath("/painel", "layout");
}

export async function cancelSession(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sid = String(form.get("id"));
  const all = form.get("all") === "1";
  const [sess] = await db.select().from(S.classSessions).where(and(eq(S.classSessions.id, sid), eq(S.classSessions.tenantId, tenant.id)));
  if (!sess) return;
  if (all && sess.recurrence) {
    await db
      .update(S.classSessions)
      .set({ status: "CANCELED" })
      .where(and(eq(S.classSessions.recurrence, sess.recurrence), eq(S.classSessions.tenantId, tenant.id), gte(S.classSessions.startsAt, sess.startsAt)));
  } else {
    await db.update(S.classSessions).set({ status: "CANCELED" }).where(eq(S.classSessions.id, sid));
  }
  revalidatePath("/painel/agenda");
}

// ───────────── Treinos ─────────────

export async function createWorkout(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sid = String(form.get("studentId"));
  const [st] = await db.select({ id: S.students.id }).from(S.students).where(and(eq(S.students.id, sid), eq(S.students.tenantId, tenant.id)));
  if (!st) redirect("/painel/alunos");
  const wid = id();
  await db.insert(S.workouts).values({ id: wid, tenantId: tenant.id, studentId: sid, name: str(form, "name") ?? "Novo treino", notes: str(form, "notes") });
  redirect(`/painel/treinos/${wid}`);
}

async function ownWorkout(workoutId: string) {
  const ctx = await requireOwner();
  const [w] = await ctx.db.select().from(S.workouts).where(and(eq(S.workouts.id, workoutId), eq(S.workouts.tenantId, ctx.tenant.id)));
  if (!w) redirect("/painel/alunos");
  return { ...ctx, workout: w };
}

export async function updateWorkout(form: FormData) {
  const { db, workout } = await ownWorkout(String(form.get("id")));
  await db.update(S.workouts).set({ name: str(form, "name") ?? workout.name, notes: str(form, "notes") }).where(eq(S.workouts.id, workout.id));
  revalidatePath(`/painel/treinos/${workout.id}`);
}

export async function addWorkoutItem(form: FormData) {
  const { db, workout } = await ownWorkout(String(form.get("workoutId")));
  const exerciseId = String(form.get("exerciseId"));
  const [{ n }] = (await db
    .select({ n: sql<number>`coalesce(max(${S.workoutItems.order}) + 1, 0)` })
    .from(S.workoutItems)
    .where(eq(S.workoutItems.workoutId, workout.id))) as [{ n: number }];
  await db.insert(S.workoutItems).values({
    id: id(),
    workoutId: workout.id,
    exerciseId,
    order: Number(n),
    sets: int(form, "sets"),
    reps: str(form, "reps"),
    load: str(form, "load"),
    restSeconds: int(form, "restSeconds"),
    notes: str(form, "notes"),
  });
  revalidatePath(`/painel/treinos/${workout.id}`);
}

export async function removeWorkoutItem(form: FormData) {
  const { db, workout } = await ownWorkout(String(form.get("workoutId")));
  await db.delete(S.workoutItems).where(and(eq(S.workoutItems.id, String(form.get("id"))), eq(S.workoutItems.workoutId, workout.id)));
  revalidatePath(`/painel/treinos/${workout.id}`);
}

export async function moveWorkoutItem(form: FormData) {
  const { db, workout } = await ownWorkout(String(form.get("workoutId")));
  const itemId = String(form.get("id"));
  const dir = String(form.get("dir")) === "up" ? -1 : 1;
  const items = await db.select().from(S.workoutItems).where(eq(S.workoutItems.workoutId, workout.id)).orderBy(S.workoutItems.order);
  const i = items.findIndex((x) => x.id === itemId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return;
  await db.update(S.workoutItems).set({ order: j }).where(eq(S.workoutItems.id, items[i]!.id));
  await db.update(S.workoutItems).set({ order: i }).where(eq(S.workoutItems.id, items[j]!.id));
  revalidatePath(`/painel/treinos/${workout.id}`);
}

export async function deleteWorkout(form: FormData) {
  const { db, workout } = await ownWorkout(String(form.get("id")));
  await db.delete(S.workouts).where(eq(S.workouts.id, workout.id));
  redirect(`/painel/alunos/${workout.studentId}?aba=treinos`);
}

/** Copia um treino para outro aluno (replicar ficha). */
export async function duplicateWorkout(form: FormData) {
  const { db, tenant, workout } = await ownWorkout(String(form.get("id")));
  const target = String(form.get("studentId"));
  const [st] = await db.select({ id: S.students.id }).from(S.students).where(and(eq(S.students.id, target), eq(S.students.tenantId, tenant.id)));
  if (!st) return;
  const items = await db.select().from(S.workoutItems).where(eq(S.workoutItems.workoutId, workout.id));
  const wid = id();
  await db.insert(S.workouts).values({ id: wid, tenantId: tenant.id, studentId: target, name: workout.name, notes: workout.notes });
  if (items.length) await db.insert(S.workoutItems).values(items.map(({ id: _old, workoutId: _w, ...rest }) => ({ ...rest, id: id(), workoutId: wid })));
  redirect(`/painel/treinos/${wid}?copiado=1`);
}

export async function createExercise(form: FormData) {
  const { db, tenant } = await requireOwner();
  const name = str(form, "name");
  if (name) {
    await db.insert(S.exercises).values({
      id: id(),
      tenantId: tenant.id,
      name,
      muscleGroup: str(form, "muscleGroup"),
      videoUrl: str(form, "videoUrl"),
      instructions: str(form, "instructions"),
    });
  }
  const back = str(form, "back");
  redirect(back ?? "/painel/exercicios?salvo=1");
}

// ───────────── Avaliações ─────────────

const MEASURES = ["cintura", "quadril", "peito", "braco", "coxa", "panturrilha"] as const;

export async function createAssessment(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sid = String(form.get("studentId"));
  const [st] = await db.select({ id: S.students.id }).from(S.students).where(and(eq(S.students.id, sid), eq(S.students.tenantId, tenant.id)));
  if (!st) redirect("/painel/alunos");
  const measures: Record<string, number> = {};
  for (const m of MEASURES) {
    const v = Number(String(form.get(m) ?? "").replace(",", "."));
    if (v > 0) measures[m] = v;
  }
  const num = (k: string) => {
    const v = Number(String(form.get(k) ?? "").replace(",", "."));
    return v > 0 ? v.toFixed(2) : null;
  };
  await db.insert(S.assessments).values({
    id: id(),
    tenantId: tenant.id,
    studentId: sid,
    date: fromLocal(str(form, "date") ?? new Date().toISOString().slice(0, 10)),
    weightKg: num("weightKg"),
    bodyFatPct: num("bodyFatPct"),
    measures,
    notes: str(form, "notes"),
  });
  redirect(`/painel/alunos/${sid}?aba=avaliacoes`);
}

export async function deleteAssessment(form: FormData) {
  const { db, tenant } = await requireOwner();
  const sid = String(form.get("studentId"));
  await db.delete(S.assessments).where(and(eq(S.assessments.id, String(form.get("id"))), eq(S.assessments.tenantId, tenant.id)));
  redirect(`/painel/alunos/${sid}?aba=avaliacoes`);
}

// ───────────── Marca e configurações ─────────────

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function saveBrand(form: FormData) {
  const { db, tenant } = await requireOwner();
  const primary = str(form, "primaryColor");
  const accent = str(form, "accentColor");
  const logo = str(form, "logoUrl");
  await db
    .update(S.tenants)
    .set({
      name: str(form, "name") ?? tenant.name,
      primaryColor: primary && HEX.test(primary) ? primary : tenant.primaryColor,
      accentColor: accent && HEX.test(accent) ? accent : tenant.accentColor,
      logoUrl: logo && /^https:\/\//.test(logo) ? logo : null,
      whatsapp: str(form, "whatsapp"),
      pixKey: str(form, "pixKey"),
      bio: str(form, "bio"),
      cref: str(form, "cref"),
      feePassThrough: form.get("feePassThrough") === "on",
      updatedAt: new Date(),
    })
    .where(eq(S.tenants.id, tenant.id));
  redirect("/painel/configuracoes?salvo=1");
}
