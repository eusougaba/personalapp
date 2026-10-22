import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { schema as S, type DB } from "@/db";
import type { Student, Tenant } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { activeSubscription, inviteUrl, studentAppUrl } from "@/lib/queries";
import {
  assignPlan,
  cancelInvoice,
  cancelSubscription,
  createAssessment,
  createInvoice,
  createWorkout,
  deleteAssessment,
  deleteStudent,
  markInvoicePaid,
  regenerateInvite,
  setStudentStatus,
  updateStudent,
} from "@/app/actions/painel";
import { CopyButton, DangerConfirm, Disclosure, SubmitButton } from "@/components/client";
import { InvoiceActions } from "@/components/invoice-actions";
import { Sparkline } from "@/components/charts";
import { Icon } from "@/components/icons";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Notice,
  PageHeader,
  STUDENT_STATUS,
  Select,
  Tabs,
  Textarea,
  btn,
  invoiceTone,
} from "@/components/ui";
import {
  INTERVAL_LABEL,
  METHOD_LABEL,
  PLAN_TYPE_LABEL,
  age,
  brl,
  fmtDate,
  fmtDayMonth,
  fmtWeekday,
  toLocalDate,
  toLocalTime,
  todayLocal,
  whatsappLink,
} from "@/lib/format";

type Ctx = { db: DB; tenant: Tenant; student: Student };

export default async function AlunoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; criado?: string; salvo?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { aba = "resumo", criado, salvo } = await searchParams;
  const { db, tenant } = await requireOwner();
  const [student] = await db.select().from(S.students).where(and(eq(S.students.id, id), eq(S.students.tenantId, tenant.id)));
  if (!student) notFound();
  const ctx = { db, tenant, student };
  const st = STUDENT_STATUS[student.status]!;
  const base = `/painel/alunos/${id}`;
  const years = age(student.birthDate);

  return (
    <>
      <PageHeader
        back="/painel/alunos"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={student.name} size={44} color={tenant.primaryColor} />
            <span className="truncate">{student.name}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            {student.goal && <span>{student.goal}</span>}
            {years != null && <span>· {years} anos</span>}
          </span>
        }
        actions={
          student.phone ? (
            <LinkButton href={whatsappLink(student.phone, `Oi ${student.name.split(" ")[0]}!`)} external variant="secondary" icon="whatsapp">
              WhatsApp
            </LinkButton>
          ) : undefined
        }
      />
      {criado && <div className="mb-4"><Notice tone="green">Aluno cadastrado! Envie o convite abaixo para ele ativar o acesso ao app.</Notice></div>}
      {salvo && <div className="mb-4"><Notice tone="green">Dados salvos.</Notice></div>}
      <Tabs
        active={aba}
        tabs={[
          { key: "resumo", label: "Resumo", href: base },
          { key: "plano", label: "Plano", href: `${base}?aba=plano` },
          { key: "financeiro", label: "Financeiro", href: `${base}?aba=financeiro` },
          { key: "treinos", label: "Treinos", href: `${base}?aba=treinos` },
          { key: "avaliacoes", label: "Avaliações", href: `${base}?aba=avaliacoes` },
          { key: "presenca", label: "Presença", href: `${base}?aba=presenca` },
          { key: "dados", label: "Dados", href: `${base}?aba=dados` },
        ]}
      />
      {aba === "resumo" && <Resumo {...ctx} />}
      {aba === "plano" && <Plano {...ctx} />}
      {aba === "financeiro" && <Financeiro {...ctx} />}
      {aba === "treinos" && <Treinos {...ctx} />}
      {aba === "avaliacoes" && <Avaliacoes {...ctx} />}
      {aba === "presenca" && <Presenca {...ctx} />}
      {aba === "dados" && <Dados {...ctx} />}
    </>
  );
}

async function Resumo({ db, tenant, student }: Ctx) {
  const [sub, invoices, next] = await Promise.all([
    activeSubscription(db, student.id),
    db.select().from(S.invoices).where(and(eq(S.invoices.studentId, student.id), inArray(S.invoices.status, ["PENDING", "OVERDUE"]))).orderBy(asc(S.invoices.dueDate)),
    db
      .select({ s: S.classSessions })
      .from(S.attendances)
      .innerJoin(S.classSessions, eq(S.classSessions.id, S.attendances.sessionId))
      .where(and(eq(S.attendances.studentId, student.id), gte(S.classSessions.startsAt, new Date()), eq(S.classSessions.status, "SCHEDULED")))
      .orderBy(asc(S.classSessions.startsAt))
      .limit(4),
  ]);
  const invite = student.inviteToken ? inviteUrl(tenant.slug, student.inviteToken) : null;
  const inviteMsg = invite
    ? `Oi ${student.name.split(" ")[0]}! Criei seu acesso ao app de treinos ${tenant.name}. Lá você vê seus treinos, sua agenda e paga suas mensalidades. Ative aqui: ${invite}`
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {invite ? (
          <Card title="Convite de acesso ao app">
            <div className="space-y-3 p-5">
              <p className="text-sm text-zinc-600">O aluno ainda não ativou o acesso. Envie o link para ele criar a senha.</p>
              <div className="truncate rounded-xl bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700">{invite}</div>
              <div className="flex flex-wrap gap-2">
                <LinkButton href={whatsappLink(student.phone, inviteMsg)} external variant="success" icon="whatsapp" size="sm">
                  Enviar pelo WhatsApp
                </LinkButton>
                <CopyButton text={invite} label="Copiar link" />
                <form action={regenerateInvite}>
                  <input type="hidden" name="id" value={student.id} />
                  <SubmitButton variant="ghost" size="sm" pendingText="Gerando…">Gerar novo link</SubmitButton>
                </form>
              </div>
            </div>
          </Card>
        ) : (
          <Notice tone="blue">
            Aluno com acesso ativo ao app: <a className="underline" href={studentAppUrl(tenant.slug)} target="_blank">{studentAppUrl(tenant.slug)}</a>
          </Notice>
        )}

        <Card title="Próximas aulas" action={<Link href={`/painel/agenda?nova=1&aluno=${student.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">Agendar</Link>}>
          {next.length === 0 ? (
            <p className="px-5 py-4 text-sm text-zinc-500">Nenhuma aula agendada.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {next.map(({ s }) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="first-letter:uppercase text-zinc-800">{fmtWeekday(s.startsAt)}, {fmtDayMonth(s.startsAt)}</span>
                  <span className="text-zinc-500">{toLocalTime(s.startsAt)} · {s.online ? "Online" : s.location ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {student.notes && (
          <Card title="Observações">
            <p className="whitespace-pre-wrap p-5 text-sm text-zinc-700">{student.notes}</p>
          </Card>
        )}
      </div>
      <div className="space-y-6">
        <Card title="Plano atual" action={<Link href="?aba=plano" className="text-sm text-zinc-500 hover:text-zinc-900">Gerenciar</Link>}>
          <div className="p-5">
            {sub ? (
              <>
                <p className="font-medium text-zinc-900">{sub.plan.name}</p>
                <p className="text-2xl font-semibold tracking-tight">{brl(sub.sub.priceCents)}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {PLAN_TYPE_LABEL[sub.plan.type]}
                  {sub.plan.interval ? ` · por ${INTERVAL_LABEL[sub.plan.interval]}` : ""}
                  {sub.sub.sessionsLeft != null ? ` · ${sub.sub.sessionsLeft} aulas restantes` : ""}
                </p>
                {sub.sub.status === "PAUSED" && <div className="mt-2"><Badge tone="yellow">Pausado</Badge></div>}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Sem plano ativo.</p>
            )}
          </div>
        </Card>
        <Card title="Pendências" action={<Link href="?aba=financeiro" className="text-sm text-zinc-500 hover:text-zinc-900">Financeiro</Link>}>
          {invoices.length === 0 ? (
            <p className="px-5 py-4 text-sm text-zinc-500">Nenhuma cobrança em aberto.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {invoices.map((i) => {
                const t = invoiceTone(i.status, i.dueDate);
                return (
                  <li key={i.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-zinc-900">{brl(i.amountCents)}</p>
                      <p className="text-xs text-zinc-500">vence {fmtDate(i.dueDate)}</p>
                    </div>
                    <Badge tone={t.tone}>{t.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="Contato">
          <dl className="space-y-2 p-5 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-zinc-500">WhatsApp</dt><dd className="text-zinc-900">{student.phone ?? "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-zinc-500">E-mail</dt><dd className="truncate text-zinc-900">{student.email ?? "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-zinc-500">Nascimento</dt><dd className="text-zinc-900">{fmtDate(student.birthDate)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-zinc-500">Desde</dt><dd className="text-zinc-900">{fmtDate(student.createdAt)}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

async function Plano({ db, tenant, student }: Ctx) {
  const [sub, plans, history] = await Promise.all([
    activeSubscription(db, student.id),
    db.select().from(S.plans).where(and(eq(S.plans.tenantId, tenant.id), eq(S.plans.active, true))).orderBy(asc(S.plans.priceCents)),
    db
      .select({ sub: S.subscriptions, plan: S.plans })
      .from(S.subscriptions)
      .innerJoin(S.plans, eq(S.plans.id, S.subscriptions.planId))
      .where(eq(S.subscriptions.studentId, student.id))
      .orderBy(desc(S.subscriptions.startDate)),
  ]);
  const today = todayLocal();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title={sub ? "Trocar de plano" : "Vincular plano"}>
        {plans.length === 0 ? (
          <EmptyState icon="tag" title="Nenhum plano criado" action={<LinkButton href="/painel/planos">Criar planos</LinkButton>} />
        ) : (
          <form action={assignPlan} className="grid gap-4 p-5 sm:grid-cols-2">
            <input type="hidden" name="studentId" value={student.id} />
            <Field label="Plano" className="sm:col-span-2">
              <Select name="planId" required>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {brl(p.priceCents)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valor personalizado" hint="Vazio = valor do plano">
              <Input name="price" inputMode="decimal" placeholder="0,00" />
            </Field>
            <Field label="Início">
              <Input type="date" name="startDate" defaultValue={today} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
              <input type="checkbox" name="firstInvoice" defaultChecked /> Gerar cobrança agora
            </label>
            <Field label="Vencimento">
              <Input type="date" name="firstDue" defaultValue={today} />
            </Field>
            <div className="flex items-end">
              <SubmitButton className="w-full">{sub ? "Trocar plano" : "Vincular plano"}</SubmitButton>
            </div>
            {sub && <p className="text-xs text-zinc-500 sm:col-span-2">O plano atual será encerrado automaticamente.</p>}
          </form>
        )}
      </Card>
      <Card title="Histórico de planos">
        {history.length === 0 ? (
          <p className="px-5 py-4 text-sm text-zinc-500">Nenhum plano ainda.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {history.map(({ sub: s, plan }) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="font-medium text-zinc-900">{plan.name}</p>
                  <p className="text-sm text-zinc-500">
                    {brl(s.priceCents)} · desde {fmtDate(s.startDate)}
                    {s.endDate ? ` até ${fmtDate(s.endDate)}` : ""}
                    {s.sessionsLeft != null ? ` · ${s.sessionsLeft} aulas restantes` : ""}
                  </p>
                </div>
                {s.status === "ACTIVE" ? (
                  <form action={cancelSubscription}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="studentId" value={student.id} />
                    <DangerConfirm label="Encerrar" confirmLabel="Encerrar plano" />
                  </form>
                ) : (
                  <Badge tone={s.status === "PAUSED" ? "yellow" : "gray"}>{s.status === "PAUSED" ? "Pausado" : "Encerrado"}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function Financeiro({ db, tenant, student }: Ctx) {
  const invoices = await db.select().from(S.invoices).where(eq(S.invoices.studentId, student.id)).orderBy(desc(S.invoices.dueDate));
  const paid = invoices.filter((i) => i.status === "PAID").reduce((a, i) => a + i.amountCents, 0);
  const open = invoices.filter((i) => i.status === "PENDING" || i.status === "OVERDUE").reduce((a, i) => a + i.amountCents, 0);
  const back = `/painel/alunos/${student.id}?aba=financeiro`;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm text-zinc-500">Total pago</p><p className="text-xl font-semibold text-emerald-600">{brl(paid)}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm text-zinc-500">Em aberto</p><p className="text-xl font-semibold">{brl(open)}</p></div>
        <div className="col-span-2 sm:col-span-1">
          <Disclosure label="Nova cobrança">
            <form action={createInvoice} className="grid gap-3">
              <input type="hidden" name="studentId" value={student.id} />
              <Field label="Descrição"><Input name="description" placeholder="Ex.: Aula extra" required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor"><Input name="amount" inputMode="decimal" placeholder="0,00" required /></Field>
                <Field label="Vencimento"><Input type="date" name="dueDate" defaultValue={todayLocal()} /></Field>
              </div>
              <SubmitButton>Criar cobrança</SubmitButton>
            </form>
          </Disclosure>
        </div>
      </div>
      <Card title="Cobranças">
        {invoices.length === 0 ? (
          <EmptyState icon="receipt" title="Nenhuma cobrança" />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {invoices.map((i) => {
              const t = invoiceTone(i.status, i.dueDate);
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">{i.description}</p>
                    <p className="text-sm text-zinc-500">
                      {brl(i.amountCents)} · vence {fmtDate(i.dueDate)}
                      {i.paidAt ? ` · pago em ${fmtDate(i.paidAt)}${i.method ? ` (${METHOD_LABEL[i.method]})` : ""}` : ""}
                    </p>
                  </div>
                  <Badge tone={t.tone}>{t.label}</Badge>
                  <InvoiceActions invoice={i} back={back} phone={student.phone} name={student.name} tenant={tenant} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function Treinos({ db, student }: Ctx) {
  const workouts = await db.select().from(S.workouts).where(eq(S.workouts.studentId, student.id)).orderBy(asc(S.workouts.name));
  const ids = workouts.map((w) => w.id);
  const [items, logs] = await Promise.all([
    ids.length
      ? db.select({ workoutId: S.workoutItems.workoutId, name: S.exercises.name }).from(S.workoutItems).innerJoin(S.exercises, eq(S.exercises.id, S.workoutItems.exerciseId)).where(inArray(S.workoutItems.workoutId, ids)).orderBy(asc(S.workoutItems.order))
      : [],
    ids.length ? db.select().from(S.workoutLogs).where(inArray(S.workoutLogs.workoutId, ids)).orderBy(desc(S.workoutLogs.completedAt)).limit(10) : [],
  ]);
  return (
    <div className="space-y-6">
      <Disclosure label="Novo treino">
        <form action={createWorkout} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="studentId" value={student.id} />
          <Field label="Nome do treino" className="sm:col-span-2"><Input name="name" placeholder="Ex.: Treino A · Inferiores" required /></Field>
          <div className="flex items-end"><SubmitButton className="w-full">Criar e montar</SubmitButton></div>
        </form>
      </Disclosure>
      {workouts.length === 0 ? (
        <Card><EmptyState icon="dumbbell" title="Nenhum treino montado" text="Crie o primeiro treino e escolha os exercícios da biblioteca." /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {workouts.map((w) => {
            const ex = items.filter((i) => i.workoutId === w.id);
            const last = logs.find((l) => l.workoutId === w.id);
            return (
              <Link key={w.id} href={`/painel/treinos/${w.id}`} className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-zinc-900">{w.name}</p>
                  <Badge>{ex.length} exercícios</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{ex.map((e) => e.name).join(" · ") || "Sem exercícios ainda"}</p>
                <p className="mt-3 text-xs text-zinc-400">{last ? `Último feito em ${fmtDate(last.completedAt)}` : "Ainda não realizado pelo aluno"}</p>
              </Link>
            );
          })}
        </div>
      )}
      {logs.length > 0 && (
        <Card title="Treinos concluídos pelo aluno">
          <ul className="divide-y divide-zinc-100">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-zinc-800">{workouts.find((w) => w.id === l.workoutId)?.name}</span>
                <span className="text-zinc-500">
                  {fmtDate(l.completedAt)}
                  {l.effort ? ` · esforço ${l.effort}/10` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const MEASURE_LABEL: Record<string, string> = { cintura: "Cintura", quadril: "Quadril", peito: "Peito", braco: "Braço", coxa: "Coxa", panturrilha: "Panturrilha" };

async function Avaliacoes({ db, tenant, student }: Ctx) {
  const list = await db.select().from(S.assessments).where(eq(S.assessments.studentId, student.id)).orderBy(asc(S.assessments.date));
  const weights = list.filter((a) => a.weightKg).map((a) => Number(a.weightKg));
  const fats = list.filter((a) => a.bodyFatPct).map((a) => Number(a.bodyFatPct));
  const first = list[0];
  const last = list.at(-1);
  const delta = (a?: string | null, b?: string | null) => (a && b ? Number(b) - Number(a) : null);
  const dw = delta(first?.weightKg, last?.weightKg);
  const df = delta(first?.bodyFatPct, last?.bodyFatPct);
  return (
    <div className="space-y-6">
      {!student.healthDataConsentAt && (
        <Notice tone="yellow">O aluno ainda não deu consentimento LGPD para dados de saúde (é registrado quando ele ativa o acesso ao app).</Notice>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Peso (kg)">
          <div className="p-5">
            <p className="text-2xl font-semibold">{last?.weightKg ? Number(last.weightKg).toFixed(1) : "—"}</p>
            {dw != null && list.length > 1 && <p className={`text-sm ${dw <= 0 ? "text-emerald-600" : "text-zinc-600"}`}>{dw > 0 ? "+" : ""}{dw.toFixed(1)} kg desde {fmtDate(first!.date)}</p>}
            <div className="mt-3"><Sparkline values={weights} color={tenant.accentColor} /></div>
          </div>
        </Card>
        <Card title="% de gordura">
          <div className="p-5">
            <p className="text-2xl font-semibold">{last?.bodyFatPct ? `${Number(last.bodyFatPct).toFixed(1)}%` : "—"}</p>
            {df != null && list.length > 1 && <p className={`text-sm ${df <= 0 ? "text-emerald-600" : "text-zinc-600"}`}>{df > 0 ? "+" : ""}{df.toFixed(1)} p.p. desde {fmtDate(first!.date)}</p>}
            <div className="mt-3"><Sparkline values={fats} color={tenant.primaryColor} /></div>
          </div>
        </Card>
      </div>
      <Disclosure label="Nova avaliação">
        <form action={createAssessment} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input type="hidden" name="studentId" value={student.id} />
          <Field label="Data"><Input type="date" name="date" defaultValue={todayLocal()} /></Field>
          <Field label="Peso (kg)"><Input name="weightKg" inputMode="decimal" /></Field>
          <Field label="% gordura"><Input name="bodyFatPct" inputMode="decimal" /></Field>
          {Object.entries(MEASURE_LABEL).map(([k, v]) => (
            <Field key={k} label={`${v} (cm)`}><Input name={k} inputMode="decimal" /></Field>
          ))}
          <Field label="Observações" className="col-span-2 sm:col-span-4"><Textarea name="notes" rows={2} /></Field>
          <div className="col-span-2 sm:col-span-4"><SubmitButton>Salvar avaliação</SubmitButton></div>
        </form>
      </Disclosure>
      <Card title="Histórico">
        {list.length === 0 ? (
          <EmptyState icon="ruler" title="Nenhuma avaliação registrada" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Data</th>
                  <th className="px-4 py-2.5">Peso</th>
                  <th className="px-4 py-2.5">% gordura</th>
                  {Object.values(MEASURE_LABEL).map((m) => <th key={m} className="px-4 py-2.5">{m}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[...list].reverse().map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2.5 font-medium">{fmtDate(a.date)}</td>
                    <td className="px-4 py-2.5">{a.weightKg ? Number(a.weightKg).toFixed(1) : "—"}</td>
                    <td className="px-4 py-2.5">{a.bodyFatPct ? Number(a.bodyFatPct).toFixed(1) : "—"}</td>
                    {Object.keys(MEASURE_LABEL).map((k) => <td key={k} className="px-4 py-2.5">{a.measures?.[k] ? Number(a.measures[k]).toFixed(1) : "—"}</td>)}
                    <td className="px-4 py-2.5 text-right">
                      <form action={deleteAssessment}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="studentId" value={student.id} />
                        <DangerConfirm label="" confirmLabel="Excluir" />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

async function Presenca({ db, student }: Ctx) {
  const rows = await db
    .select({ s: S.classSessions, a: S.attendances })
    .from(S.attendances)
    .innerJoin(S.classSessions, eq(S.classSessions.id, S.attendances.sessionId))
    .where(eq(S.attendances.studentId, student.id))
    .orderBy(desc(S.classSessions.startsAt))
    .limit(60);
  const past = rows.filter((r) => r.s.startsAt < new Date() && r.s.status !== "CANCELED");
  const present = past.filter((r) => r.a.present === true).length;
  const missed = past.filter((r) => r.a.present === false).length;
  const rate = present + missed ? Math.round((present / (present + missed)) * 100) : null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm text-zinc-500">Presenças</p><p className="text-xl font-semibold text-emerald-600">{present}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm text-zinc-500">Faltas</p><p className="text-xl font-semibold text-red-600">{missed}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm text-zinc-500">Frequência</p><p className="text-xl font-semibold">{rate != null ? `${rate}%` : "—"}</p></div>
      </div>
      <Card title="Aulas">
        {rows.length === 0 ? (
          <EmptyState icon="calendar" title="Nenhuma aula registrada" />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map(({ s, a }) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="first-letter:uppercase text-zinc-800">{fmtWeekday(s.startsAt)}, {fmtDate(s.startsAt)} · {toLocalTime(s.startsAt)}</span>
                {s.status === "CANCELED" ? <Badge>Cancelada</Badge> : a.present === true ? <Badge tone="green">Presente</Badge> : a.present === false ? <Badge tone="red">Faltou</Badge> : s.startsAt > new Date() ? <Badge tone="blue">Agendada</Badge> : <Badge tone="yellow">Sem registro</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Dados({ student }: Ctx) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Editar dados" className="lg:col-span-2">
        <form action={updateStudent} className="grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={student.id} />
          <Field label="Nome" className="sm:col-span-2"><Input name="name" defaultValue={student.name} required /></Field>
          <Field label="WhatsApp"><Input name="phone" defaultValue={student.phone ?? ""} /></Field>
          <Field label="E-mail"><Input name="email" type="email" defaultValue={student.email ?? ""} /></Field>
          <Field label="Nascimento"><Input name="birthDate" type="date" defaultValue={student.birthDate ? toLocalDate(student.birthDate) : ""} /></Field>
          <Field label="Objetivo"><Input name="goal" defaultValue={student.goal ?? ""} /></Field>
          <Field label="Observações" className="sm:col-span-2"><Textarea name="notes" defaultValue={student.notes ?? ""} /></Field>
          <div className="sm:col-span-2"><SubmitButton>Salvar</SubmitButton></div>
        </form>
      </Card>
      <div className="space-y-6">
        <Card title="Situação">
          <div className="flex flex-wrap gap-2 p-5">
            {(["ACTIVE", "PAUSED", "INACTIVE"] as const).map((s) => (
              <form key={s} action={setStudentStatus}>
                <input type="hidden" name="id" value={student.id} />
                <input type="hidden" name="status" value={s} />
                <SubmitButton variant={student.status === s ? "primary" : "secondary"} size="sm" pendingText="…">
                  {STUDENT_STATUS[s]!.label}
                </SubmitButton>
              </form>
            ))}
          </div>
        </Card>
        <Card title="Excluir aluno">
          <form action={deleteStudent} className="space-y-3 p-5">
            <input type="hidden" name="id" value={student.id} />
            <p className="text-sm text-zinc-500">Remove o aluno e todo o histórico (cobranças, treinos, avaliações). Não pode ser desfeito.</p>
            <DangerConfirm label="Excluir aluno" confirmLabel="Sim, excluir tudo" />
          </form>
        </Card>
      </div>
    </div>
  );
}
