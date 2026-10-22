import Link from "next/link";
import { and, count, eq, gte, inArray, lt, notExists, sql } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { cashByMonth, monthFinance, overdueInvoices, sessionsBetween } from "@/lib/queries";
import { Avatar, Badge, Card, EmptyState, LinkButton, Notice, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import { RevenueChart } from "@/components/charts";
import {
  addDays,
  brl,
  currentMonth,
  fmtDate,
  fmtDayMonth,
  fromLocal,
  monthLabel,
  shiftMonth,
  toLocalTime,
  todayLocal,
  whatsappLink,
} from "@/lib/format";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { bemvindo } = await searchParams;
  const { db, tenant, user } = await requireOwner();
  const ym = currentMonth();
  const today = todayLocal();

  const [[active], [total], fin, overdue, todaySessions, chart, birthdays, noWorkout] = await Promise.all([
    db.select({ n: count() }).from(S.students).where(and(eq(S.students.tenantId, tenant.id), eq(S.students.status, "ACTIVE"))),
    db.select({ n: count() }).from(S.students).where(eq(S.students.tenantId, tenant.id)),
    monthFinance(db, tenant.id, ym),
    overdueInvoices(db, tenant.id, 6),
    sessionsBetween(db, tenant.id, fromLocal(today, "00:00"), fromLocal(addDays(today, 1), "00:00")),
    cashByMonth(db, tenant.id, [-5, -4, -3, -2, -1, 0].map((k) => shiftMonth(ym, k))),
    db
      .select()
      .from(S.students)
      .where(
        and(
          eq(S.students.tenantId, tenant.id),
          inArray(S.students.status, ["ACTIVE", "PAUSED"]),
          sql`to_char(${S.students.birthDate}, 'MM') = ${ym.slice(5)}`,
        ),
      ),
    db
      .select({ id: S.students.id, name: S.students.name })
      .from(S.students)
      .where(
        and(
          eq(S.students.tenantId, tenant.id),
          eq(S.students.status, "ACTIVE"),
          notExists(db.select({ x: S.workouts.id }).from(S.workouts).where(and(eq(S.workouts.studentId, S.students.id), eq(S.workouts.active, true)))),
        ),
      )
      .limit(5),
  ]);
  const lateTotal = overdue.reduce((a, r) => a + r.invoice.amountCents, 0);
  const sessionsToday = todaySessions.filter((s) => s.status !== "CANCELED");
  const firstName = (user.name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName || "personal"}`}
        subtitle={`${fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: undefined })} · ${monthLabel(ym)}`}
        actions={
          <>
            <LinkButton href="/painel/agenda?nova=1" variant="secondary" icon="calendar">
              Agendar aula
            </LinkButton>
            <LinkButton href="/painel/alunos/novo" icon="plus">
              Novo aluno
            </LinkButton>
          </>
        }
      />

      {bemvindo && (
        <div className="mb-6">
          <Notice tone="green">
            Conta criada! Comece criando seus <Link className="underline" href="/painel/planos">planos</Link>, depois cadastre seus{" "}
            <Link className="underline" href="/painel/alunos/novo">alunos</Link> e personalize <Link className="underline" href="/painel/configuracoes">sua marca</Link>.
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Alunos ativos" value={active?.n ?? 0} hint={`${total?.n ?? 0} cadastrados`} icon="users" />
        <Stat label="Recebido no mês" value={brl(fin.billedPaid)} tone="green" hint={`Caixa: ${brl(fin.income)}`} icon="wallet" />
        <Stat label="A receber no mês" value={brl(fin.open)} hint="faturas ainda no prazo" icon="clock" />
        <Stat label="Em atraso" value={brl(lateTotal)} tone={lateTotal ? "red" : "default"} hint={`${overdue.length} fatura(s)`} icon="alert" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          title={`Aulas de hoje · ${sessionsToday.length}`}
          action={
            <Link href="/painel/agenda" className="text-sm text-zinc-500 hover:text-zinc-900">
              Ver agenda
            </Link>
          }
        >
          {sessionsToday.length === 0 ? (
            <EmptyState icon="calendar" title="Nenhuma aula hoje" text="Aproveite para revisar treinos ou cobrar pendências." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {sessionsToday.map((s) => {
                const past = s.endsAt < new Date();
                return (
                  <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-14 text-center">
                      <div className="text-base font-semibold text-zinc-900">{toLocalTime(s.startsAt)}</div>
                      <div className="text-xs text-zinc-400">{Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60000)} min</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900">{s.people.map((p) => p.student.name).join(", ") || s.title}</p>
                      <p className="flex items-center gap-1 truncate text-sm text-zinc-500">
                        <Icon name="mapPin" size={14} /> {s.online ? "Online" : s.location ?? "Local a definir"}
                      </p>
                    </div>
                    {s.people.some((p) => p.att.present === true) ? (
                      <Badge tone="green">Presente</Badge>
                    ) : s.people.some((p) => p.att.present === false) ? (
                      <Badge tone="red">Faltou</Badge>
                    ) : past ? (
                      <Badge tone="yellow">Marcar presença</Badge>
                    ) : (
                      <Badge>Agendada</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2" title="Cobranças em atraso" action={<Link href="/painel/financeiro?aba=atrasadas" className="text-sm text-zinc-500 hover:text-zinc-900">Ver todas</Link>}>
          {overdue.length === 0 ? (
            <EmptyState icon="check" title="Tudo em dia" text="Nenhum aluno com mensalidade atrasada." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {overdue.map(({ invoice, student }) => (
                <li key={invoice.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={student.name} size={34} color={tenant.primaryColor} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/painel/alunos/${student.id}?aba=financeiro`} className="block truncate text-sm font-medium text-zinc-900 hover:underline">
                      {student.name}
                    </Link>
                    <p className="text-xs text-red-600">
                      {brl(invoice.amountCents)} · venceu {fmtDayMonth(invoice.dueDate)}
                    </p>
                  </div>
                  <a
                    href={whatsappLink(
                      student.phone,
                      `Oi ${student.name.split(" ")[0]}, tudo bem? Passando para lembrar da mensalidade de ${brl(invoice.amountCents)} que venceu em ${fmtDate(invoice.dueDate)}.${tenant.pixKey ? ` Chave Pix: ${tenant.pixKey}` : ""} Qualquer dúvida me chama!`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                    title="Cobrar pelo WhatsApp"
                  >
                    <Icon name="whatsapp" size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Fluxo de caixa · últimos 6 meses">
          <div className="p-5">
            <RevenueChart data={chart.map((c) => ({ label: monthLabel(c.ym, true), income: c.income, expense: c.expense }))} />
          </div>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Aniversariantes de ${monthLabel(ym).split(" ")[0]}`}>
            {birthdays.length === 0 ? (
              <p className="px-5 py-4 text-sm text-zinc-500">Nenhum aniversariante este mês.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {birthdays.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                    <Icon name="gift" size={18} className="text-pink-500" />
                    <span className="flex-1 truncate text-sm text-zinc-800">{b.name}</span>
                    <span className="text-sm text-zinc-500">{b.birthDate ? fmtDayMonth(b.birthDate) : ""}</span>
                    <a
                      href={whatsappLink(b.phone, `Parabéns, ${b.name.split(" ")[0]}! 🎉 Muita saúde e ótimos treinos neste novo ciclo!`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600"
                      title="Mandar parabéns"
                    >
                      <Icon name="whatsapp" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Alunos ativos sem treino">
            {noWorkout.length === 0 ? (
              <p className="px-5 py-4 text-sm text-zinc-500">Todos os alunos ativos têm treino montado.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {noWorkout.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="truncate text-zinc-800">{s.name}</span>
                    <Link href={`/painel/alunos/${s.id}?aba=treinos`} className="font-medium text-emerald-700 hover:underline">
                      Montar treino
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
