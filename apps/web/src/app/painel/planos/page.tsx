import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { schema as S } from "@/db";
import type { Plan } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { savePlan, togglePlan } from "@/app/actions/painel";
import { Disclosure, SubmitButton } from "@/components/client";
import { Badge, Card, EmptyState, Field, Input, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { INTERVAL_LABEL, PLAN_TYPE_LABEL, brl, centsToInput } from "@/lib/format";

function PlanForm({ plan }: { plan?: Plan }) {
  return (
    <form action={savePlan} className="grid gap-3 sm:grid-cols-2">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <Field label="Nome do plano" className="sm:col-span-2"><Input name="name" required defaultValue={plan?.name} placeholder="Ex.: Mensal 3x por semana" /></Field>
      <Field label="Tipo">
        <Select name="type" defaultValue={plan?.type ?? "RECURRING"}>
          {Object.entries(PLAN_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Valor (R$)"><Input name="price" inputMode="decimal" required defaultValue={centsToInput(plan?.priceCents)} placeholder="0,00" /></Field>
      <Field label="Cobrança a cada" hint="Recorrente e online">
        <Select name="interval" defaultValue={plan?.interval ?? "MONTHLY"}>
          <option value="MONTHLY">Mês</option>
          <option value="QUARTERLY">Trimestre</option>
          <option value="SEMIANNUAL">Semestre</option>
          <option value="YEARLY">Ano</option>
        </Select>
      </Field>
      <Field label="Dia de vencimento" hint="1 a 28"><Input name="dueDay" type="number" min={1} max={28} defaultValue={plan?.dueDay ?? 10} /></Field>
      <Field label="Aulas por semana" hint="Recorrente"><Input name="sessionsPerWeek" type="number" min={0} defaultValue={plan?.sessionsPerWeek ?? ""} /></Field>
      <Field label="Total de aulas" hint="Pacote"><Input name="sessionsTotal" type="number" min={1} defaultValue={plan?.sessionsTotal ?? ""} /></Field>
      <Field label="Validade (dias)" hint="Pacote"><Input name="validityDays" type="number" min={1} defaultValue={plan?.validityDays ?? ""} /></Field>
      <Field label="Desconto (%)"><Input name="discountPct" type="number" min={0} max={100} defaultValue={plan?.discountPct ?? ""} /></Field>
      <Field label="Multa por atraso (%)"><Input name="lateFeePct" type="number" min={0} max={20} defaultValue={plan?.lateFeePct ?? ""} /></Field>
      <Field label="Descrição (aparece para o aluno)" className="sm:col-span-2"><Textarea name="description" rows={2} defaultValue={plan?.description ?? ""} /></Field>
      <div className="sm:col-span-2"><SubmitButton>{plan ? "Salvar alterações" : "Criar plano"}</SubmitButton></div>
    </form>
  );
}

export default async function Planos({ searchParams }: { searchParams: Promise<{ salvo?: string; editar?: string }> }) {
  const { salvo, editar } = await searchParams;
  const { db, tenant } = await requireOwner();
  const plans = await db.select().from(S.plans).where(eq(S.plans.tenantId, tenant.id)).orderBy(asc(S.plans.type), asc(S.plans.priceCents));
  const counts = await db
    .select({ planId: S.subscriptions.planId, n: sql<number>`count(*)::int` })
    .from(S.subscriptions)
    .where(and(eq(S.subscriptions.tenantId, tenant.id), inArray(S.subscriptions.status, ["ACTIVE", "PAUSED"])))
    .groupBy(S.subscriptions.planId);
  const editing = plans.find((p) => p.id === editar);

  return (
    <>
      <PageHeader title="Planos" subtitle="Monte os formatos que você vende: mensalidade, pacotes, aula avulsa ou consultoria online." />
      {salvo && <div className="mb-4"><Notice tone="green">Plano salvo.</Notice></div>}
      {editing ? (
        <Card title={`Editar · ${editing.name}`} className="mb-6">
          <div className="p-5"><PlanForm plan={editing} /></div>
        </Card>
      ) : (
        <div className="mb-6"><Disclosure label="Novo plano"><PlanForm /></Disclosure></div>
      )}
      {plans.length === 0 ? (
        <Card><EmptyState icon="tag" title="Nenhum plano ainda" text="Crie seu primeiro plano para vincular aos alunos e gerar cobranças automáticas." /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const n = Number(counts.find((c) => c.planId === p.id)?.n ?? 0);
            return (
              <div key={p.id} className={`flex flex-col rounded-2xl border bg-white p-5 ${p.active ? "border-zinc-200" : "border-dashed border-zinc-300 opacity-70"}`}>
                <div className="flex items-start justify-between gap-2">
                  <Badge tone={p.type === "PACKAGE" ? "violet" : p.type === "ONLINE" ? "blue" : p.type === "SINGLE" ? "gray" : "green"}>{PLAN_TYPE_LABEL[p.type]}</Badge>
                  {!p.active && <Badge>Inativo</Badge>}
                </div>
                <p className="mt-3 font-semibold text-zinc-900">{p.name}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {brl(p.priceCents)}
                  {p.interval && <span className="text-sm font-normal text-zinc-500"> /{INTERVAL_LABEL[p.interval]}</span>}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                  {p.sessionsPerWeek ? <li>{p.sessionsPerWeek} aulas por semana</li> : null}
                  {p.sessionsTotal ? <li>{p.sessionsTotal} aulas{p.validityDays ? ` · validade ${p.validityDays} dias` : ""}</li> : null}
                  {p.dueDay ? <li>Vence todo dia {p.dueDay}</li> : null}
                  {p.discountPct ? <li>{p.discountPct}% de desconto</li> : null}
                  {p.lateFeePct ? <li>Multa de {p.lateFeePct}% por atraso</li> : null}
                </ul>
                {p.description && <p className="mt-2 text-sm text-zinc-500">{p.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <span className="text-xs text-zinc-500">{n} aluno(s)</span>
                  <div className="flex gap-1.5">
                    <a href={`/painel/planos?editar=${p.id}`} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">Editar</a>
                    <form action={togglePlan}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton variant="ghost" size="sm" pendingText="…">{p.active ? "Desativar" : "Ativar"}</SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
