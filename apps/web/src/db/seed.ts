// Dados de demonstração (personal Felipe). Só roda no banco local vazio
// ou via `npm run db:seed`. Credenciais de teste abaixo — nunca usar em produção.
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import type { DB } from "./index";
import * as s from "./schema";
import { addDays, fromLocal, shiftMonth, startOfWeek, todayLocal, currentMonth } from "../lib/format";

export const DEMO_OWNER = { email: "felipe@demo.local", password: "demo1234" };
export const DEMO_STUDENT = { email: "ana@demo.local", password: "demo1234" };

const uid = () => crypto.randomUUID();

export async function seedIfEmpty(db: DB) {
  const r = await db.execute(sql`SELECT count(*)::int AS n FROM "Tenant"`);
  const rows = (Array.isArray(r) ? r : (r as unknown as { rows: { n: number }[] }).rows) as { n: number }[];
  if (Number(rows[0]?.n ?? 0) > 0) return false;
  await seedDemo(db);
  return true;
}

export async function seedDemo(db: DB) {
  const now = new Date();
  const today = todayLocal();
  const ym = currentMonth();
  const tenantId = uid();
  const hash = await bcrypt.hash(DEMO_OWNER.password, 10);

  await db.insert(s.tenants).values({
    id: tenantId,
    slug: "felipe",
    name: "Felipe Astur Personal",
    primaryColor: "#0F172A",
    accentColor: "#F97316",
    whatsapp: "11999990000",
    pixKey: "pix@felipeastur.com.br",
    bio: "Treinamento personalizado para hipertrofia, emagrecimento e qualidade de vida.",
    cref: "000000-G/SP",
    updatedAt: now,
  });
  await db.insert(s.platformSubscriptions).values({
    id: uid(),
    tenantId,
    tier: "PRO",
    status: "TRIALING",
    priceCents: 9900,
    trialEndsAt: fromLocal(addDays(today, 14)),
  });

  const ownerId = uid();
  await db.insert(s.users).values({ id: ownerId, email: DEMO_OWNER.email, name: "Felipe Astur", passwordHash: hash });
  await db.insert(s.memberships).values({ id: uid(), userId: ownerId, tenantId, role: "OWNER" });

  // Planos
  const plan = {
    m2: uid(),
    m3: uid(),
    pack: uid(),
    single: uid(),
    online: uid(),
  };
  await db.insert(s.plans).values([
    { id: plan.m2, tenantId, name: "Mensal 2x por semana", type: "RECURRING", interval: "MONTHLY", priceCents: 48000, sessionsPerWeek: 2, dueDay: 10, lateFeePct: 2, description: "Aulas presenciais de 1h, 2 vezes por semana." },
    { id: plan.m3, tenantId, name: "Mensal 3x por semana", type: "RECURRING", interval: "MONTHLY", priceCents: 64000, sessionsPerWeek: 3, dueDay: 10, lateFeePct: 2, description: "Aulas presenciais de 1h, 3 vezes por semana." },
    { id: plan.pack, tenantId, name: "Pacote 10 aulas", type: "PACKAGE", priceCents: 90000, sessionsTotal: 10, validityDays: 60, description: "Use quando quiser, válido por 60 dias." },
    { id: plan.single, tenantId, name: "Aula avulsa", type: "SINGLE", priceCents: 10000 },
    { id: plan.online, tenantId, name: "Consultoria online", type: "ONLINE", interval: "MONTHLY", priceCents: 25000, dueDay: 5, description: "Treino no app + acompanhamento por WhatsApp." },
  ]);

  // Alunos
  const bday = (md: string, y: number) => fromLocal(`${y}-${md}`);
  const thisMonthDay = `${ym.slice(5)}-${String(Math.min(28, Number(today.slice(8)) + 3)).padStart(2, "0")}`;
  const st = [
    { name: "Ana Carolina Souza", phone: "11988887777", email: DEMO_STUDENT.email, goal: "Emagrecimento", birth: bday(thisMonthDay, 1992), plan: plan.m3, status: "ACTIVE" as const },
    { name: "Bruno Lima", phone: "11977776666", email: "bruno@exemplo.com", goal: "Hipertrofia", birth: bday("03-14", 1988), plan: plan.m3, status: "ACTIVE" as const },
    { name: "Carla Mendes", phone: "11966665555", email: "carla@exemplo.com", goal: "Condicionamento", birth: bday("07-22", 1979), plan: plan.m2, status: "ACTIVE" as const },
    { name: "Diego Rocha", phone: "11955554444", email: "diego@exemplo.com", goal: "Hipertrofia", birth: bday("11-02", 1995), plan: plan.m2, status: "ACTIVE" as const },
    { name: "Eduarda Alves", phone: "11944443333", email: "duda@exemplo.com", goal: "Saúde e postura", birth: bday("01-30", 1985), plan: plan.m2, status: "ACTIVE" as const },
    { name: "Fernando Castro", phone: "11933332222", email: "fernando@exemplo.com", goal: "Corrida", birth: bday("09-09", 1990), plan: plan.online, status: "ACTIVE" as const },
    { name: "Gabriela Nunes", phone: "11922221111", email: "gabi@exemplo.com", goal: "Pós-parto", birth: bday("05-18", 1993), plan: plan.pack, status: "PAUSED" as const },
    { name: "Henrique Prado", phone: "11911110000", email: "henrique@exemplo.com", goal: "Emagrecimento", birth: bday("12-01", 1987), plan: null, status: "INVITED" as const },
  ];
  const studentIds: string[] = [];
  const studentUserId = uid();
  await db.insert(s.users).values({
    id: studentUserId,
    email: DEMO_STUDENT.email,
    name: "Ana Carolina Souza",
    passwordHash: await bcrypt.hash(DEMO_STUDENT.password, 10),
  });
  await db.insert(s.memberships).values({ id: uid(), userId: studentUserId, tenantId, role: "STUDENT" });

  for (const [i, x] of st.entries()) {
    const id = uid();
    studentIds.push(id);
    await db.insert(s.students).values({
      id,
      tenantId,
      userId: i === 0 ? studentUserId : null,
      name: x.name,
      email: x.email,
      phone: x.phone,
      goal: x.goal,
      birthDate: x.birth,
      status: x.status,
      inviteToken: x.status === "INVITED" ? uid().replace(/-/g, "") : null,
      healthDataConsentAt: i === 0 ? now : null,
      createdAt: fromLocal(`${shiftMonth(ym, -5)}-0${(i % 8) + 1}`),
    });
  }

  // Assinaturas e faturas (5 meses anteriores + atual)
  const planPrice: Record<string, number> = { [plan.m2]: 48000, [plan.m3]: 64000, [plan.pack]: 90000, [plan.online]: 25000 };
  const planName: Record<string, string> = { [plan.m2]: "Mensal 2x por semana", [plan.m3]: "Mensal 3x por semana", [plan.pack]: "Pacote 10 aulas", [plan.online]: "Consultoria online" };
  for (const [i, x] of st.entries()) {
    if (!x.plan) continue;
    const subId = uid();
    await db.insert(s.subscriptions).values({
      id: subId,
      tenantId,
      studentId: studentIds[i]!,
      planId: x.plan,
      priceCents: planPrice[x.plan]!,
      startDate: fromLocal(`${shiftMonth(ym, -5)}-01`),
      status: x.status === "PAUSED" ? "PAUSED" : "ACTIVE",
      sessionsLeft: x.plan === plan.pack ? 4 : null,
    });
    if (x.plan === plan.pack) {
      const due = fromLocal(`${shiftMonth(ym, -1)}-05`);
      const invId = uid();
      await db.insert(s.invoices).values({ id: invId, tenantId, studentId: studentIds[i]!, subscriptionId: subId, description: "Pacote 10 aulas", amountCents: 90000, dueDate: due, status: "PAID", method: "PIX", paidAt: due, manual: true });
      await db.insert(s.ledgerEntries).values({ id: uid(), tenantId, type: "INCOME", category: "Mensalidades", description: "Pacote 10 aulas", amountCents: 90000, date: due, invoiceId: invId });
      continue;
    }
    const dueDay = x.plan === plan.online ? "05" : "10";
    for (let k = -5; k <= 0; k++) {
      const m = shiftMonth(ym, k);
      const due = fromLocal(`${m}-${dueDay}`);
      const isCurrent = k === 0;
      // mês atual: alguns pagos, alguns pendentes, dois atrasados (Diego e Eduarda)
      const late = isCurrent && (i === 3 || i === 4);
      const pending = isCurrent && (i === 1 || late);
      const paid = !pending;
      const invId = uid();
      const paidAt = paid ? fromLocal(`${m}-${String(Number(dueDay) - (i % 3)).padStart(2, "0")}`) : null;
      const status = paid ? "PAID" : due < now ? "OVERDUE" : "PENDING";
      await db.insert(s.invoices).values({
        id: invId,
        tenantId,
        studentId: studentIds[i]!,
        subscriptionId: subId,
        description: `${planName[x.plan]} · ${m.slice(5)}/${m.slice(0, 4)}`,
        amountCents: planPrice[x.plan]!,
        dueDate: due,
        status,
        method: paid ? (i % 2 ? "PIX" : "CREDIT_CARD") : null,
        paidAt,
        manual: paid,
      });
      if (paid && paidAt) {
        await db.insert(s.ledgerEntries).values({ id: uid(), tenantId, type: "INCOME", category: "Mensalidades", description: st[i]!.name, amountCents: planPrice[x.plan]!, date: paidAt, invoiceId: invId });
      }
    }
  }

  // Despesas
  for (let k = -5; k <= 0; k++) {
    const m = shiftMonth(ym, k);
    await db.insert(s.ledgerEntries).values([
      { id: uid(), tenantId, type: "EXPENSE", category: "Academia / espaço", description: "Taxa de uso da academia", amountCents: 40000, date: fromLocal(`${m}-05`) },
      { id: uid(), tenantId, type: "EXPENSE", category: "Transporte", description: "Combustível", amountCents: 32000, date: fromLocal(`${m}-15`) },
      { id: uid(), tenantId, type: "EXPENSE", category: "Ferramentas", description: "Assinatura do app", amountCents: 9900, date: fromLocal(`${m}-01`) },
    ]);
  }

  // Agenda: semana atual (seg–sáb)
  const monday = startOfWeek(today);
  const slots: [number, number, string][] = [
    [0, 0, "06:00"], [0, 2, "07:00"], [0, 3, "18:00"],
    [1, 1, "06:00"], [1, 4, "07:00"],
    [2, 0, "06:00"], [2, 2, "07:00"], [2, 3, "18:00"],
    [3, 1, "06:00"], [3, 4, "07:00"],
    [4, 0, "06:00"], [4, 1, "07:00"], [4, 2, "08:00"], [4, 3, "18:00"],
    [5, 4, "09:00"],
  ];
  for (const [dayIdx, si, time] of slots) {
    const date = addDays(monday, dayIdx);
    const startsAt = fromLocal(date, time);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const past = endsAt < now;
    const sessId = uid();
    await db.insert(s.classSessions).values({
      id: sessId,
      tenantId,
      startsAt,
      endsAt,
      location: si === 4 ? "Parque Ibirapuera" : "Smart Fit Paulista",
      status: past ? "DONE" : "SCHEDULED",
      title: "Treino personalizado",
    });
    await db.insert(s.attendances).values({ id: uid(), sessionId: sessId, studentId: studentIds[si]!, present: past ? !(si === 3 && dayIdx === 0) : null });
  }

  // Treinos
  const W = (studentIdx: number, name: string, items: [string, number, string, string][]) => ({ studentIdx, name, items });
  const ws = [
    W(0, "Treino A · Inferiores", [["ex_agachamento_livre", 4, "10", "20 kg"], ["ex_leg_press", 4, "12", "120 kg"], ["ex_cadeira_extensora", 3, "15", "35 kg"], ["ex_elevacao_pelvica", 4, "12", "40 kg"], ["ex_prancha", 3, "40s", ""]]),
    W(0, "Treino B · Superiores", [["ex_puxada_frente", 4, "12", "35 kg"], ["ex_supino_inclinado", 3, "12", "10 kg"], ["ex_remada_baixa", 3, "12", "30 kg"], ["ex_elevacao_lateral", 3, "15", "4 kg"], ["ex_esteira", 1, "20 min", "inclinação 6"]]),
    W(1, "Treino A · Peito e tríceps", [["ex_supino_reto", 4, "8-10", "70 kg"], ["ex_supino_inclinado", 4, "10", "26 kg"], ["ex_crossover", 3, "12", "20 kg"], ["ex_triceps_polia", 4, "12", "30 kg"], ["ex_triceps_frances", 3, "10", "16 kg"]]),
    W(1, "Treino B · Costas e bíceps", [["ex_barra_fixa", 4, "8", "peso corporal"], ["ex_remada_curvada", 4, "10", "60 kg"], ["ex_remada_unilateral", 3, "12", "28 kg"], ["ex_rosca_direta", 4, "10", "30 kg"], ["ex_rosca_martelo", 3, "12", "14 kg"]]),
    W(2, "Treino Full body", [["ex_kettlebell_swing", 4, "15", "16 kg"], ["ex_afundo", 3, "12", "8 kg"], ["ex_remada_baixa", 3, "12", "25 kg"], ["ex_desenvolvimento", 3, "12", "8 kg"], ["ex_dead_bug", 3, "12", ""]]),
  ];
  for (const w of ws) {
    const wid = uid();
    await db.insert(s.workouts).values({ id: wid, tenantId, studentId: studentIds[w.studentIdx]!, name: w.name });
    await db.insert(s.workoutItems).values(
      w.items.map(([ex, sets, reps, load], order) => ({ id: uid(), workoutId: wid, exerciseId: ex, order, sets, reps, load: load || null, restSeconds: 60 })),
    );
    await db.insert(s.workoutLogs).values([
      { id: uid(), workoutId: wid, completedAt: fromLocal(addDays(today, -7), "07:00"), effort: 7 },
      { id: uid(), workoutId: wid, completedAt: fromLocal(addDays(today, -3), "07:00"), effort: 8 },
    ]);
  }

  // Avaliações mensais
  const evo: [number, number[], number[]][] = [
    [0, [78.4, 76.9, 75.8, 74.6, 73.9], [32.5, 31.2, 30.1, 29.0, 28.2]],
    [1, [82.0, 82.9, 83.6, 84.1, 84.8], [18.0, 17.6, 17.1, 16.8, 16.2]],
  ];
  for (const [si, weights, fats] of evo) {
    for (const [k, w] of weights.entries()) {
      await db.insert(s.assessments).values({
        id: uid(),
        tenantId,
        studentId: studentIds[si]!,
        date: fromLocal(`${shiftMonth(ym, k - 4)}-02`),
        weightKg: w.toFixed(2),
        bodyFatPct: fats[k]!.toFixed(1),
        measures: si === 0 ? { cintura: 84 - k * 1.5, quadril: 104 - k, braco: 30 - k * 0.2, coxa: 60 - k * 0.5 } : { cintura: 86 - k * 0.3, peito: 102 + k, braco: 37 + k * 0.4, coxa: 58 + k * 0.5 },
      });
    }
  }
}
