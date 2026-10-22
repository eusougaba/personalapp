import Link from "next/link";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { monthFinance, overdueInvoices } from "@/lib/queries";
import { createInvoice, createLedgerEntry, deleteLedgerEntry, generateMonthlyInvoices } from "@/app/actions/painel";
import { DangerConfirm, Disclosure, SubmitButton } from "@/components/client";
import { InvoiceActions } from "@/components/invoice-actions";
import { Icon } from "@/components/icons";
import { Avatar, Badge, Card, EmptyState, Field, Input, Notice, PageHeader, Select, Stat, Tabs, invoiceTone } from "@/components/ui";
import { METHOD_LABEL, brl, currentMonth, fmtDate, fmtDayMonth, monthLabel, monthRange, shiftMonth, todayLocal } from "@/lib/format";

const EXPENSE_CATEGORIES = ["Academia / espaço", "Transporte", "Equipamentos", "Ferramentas", "Marketing", "Cursos", "Impostos", "Outras despesas"];

export default async function Financeiro({ searchParams }: { searchParams: Promise<{ mes?: string; aba?: string; geradas?: string }> }) {
  const sp = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : currentMonth();
  const aba = sp.aba ?? "cobrancas";
  const { db, tenant } = await requireOwner();
  const { start, end } = monthRange(ym);
  const [fin, invoices, overdue, ledger, students] = await Promise.all([
    monthFinance(db, tenant.id, ym),
    db
      .select({ invoice: S.invoices, student: S.students })
      .from(S.invoices)
      .innerJoin(S.students, eq(S.students.id, S.invoices.studentId))
      .where(and(eq(S.invoices.tenantId, tenant.id), gte(S.invoices.dueDate, start), lt(S.invoices.dueDate, end)))
      .orderBy(asc(S.invoices.dueDate)),
    overdueInvoices(db, tenant.id, 200),
    db
      .select()
      .from(S.ledgerEntries)
      .where(and(eq(S.ledgerEntries.tenantId, tenant.id), gte(S.ledgerEntries.date, start), lt(S.ledgerEntries.date, end)))
      .orderBy(desc(S.ledgerEntries.date)),
    db.select({ id: S.students.id, name: S.students.name }).from(S.students).where(eq(S.students.tenantId, tenant.id)).orderBy(asc(S.students.name)),
  ]);
  const lateAll = overdue.reduce((a, r) => a + r.invoice.amountCents, 0);
  const saldo = fin.income - fin.expense;
  const q = (extra: string) => `/painel/financeiro?mes=${ym}${extra}`;
  const back = q(`&aba=${aba}`);
  const asaasReady = Boolean(process.env.ASAAS_API_KEY) && tenant.paymentsEnabled;

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Mensalidades, recebimentos e despesas do seu negócio."
        actions={
          <form action={generateMonthlyInvoices}>
            <input type="hidden" name="month" value={ym} />
            <SubmitButton icon="receipt" pendingText="Gerando…">Gerar mensalidades de {monthLabel(ym).split(" ")[0]}</SubmitButton>
          </form>
        }
      />
      {sp.geradas != null && (
        <div className="mb-4">
          <Notice tone={Number(sp.geradas) ? "green" : "blue"}>
            {Number(sp.geradas) ? `${sp.geradas} mensalidade(s) gerada(s) para ${monthLabel(ym)}.` : `Nenhuma mensalidade nova: todas de ${monthLabel(ym)} já foram geradas.`}
          </Notice>
        </div>
      )}

      <div className="mb-5 flex items-center gap-2">
        <Link href={`/painel/financeiro?mes=${shiftMonth(ym, -1)}&aba=${aba}`} className="rounded-lg border border-zinc-200 bg-white p-2 hover:bg-zinc-50" aria-label="Mês anterior"><Icon name="chevronLeft" size={16} /></Link>
        <span className="min-w-40 text-center font-medium first-letter:uppercase">{monthLabel(ym)}</span>
        <Link href={`/painel/financeiro?mes=${shiftMonth(ym, 1)}&aba=${aba}`} className="rounded-lg border border-zinc-200 bg-white p-2 hover:bg-zinc-50" aria-label="Próximo mês"><Icon name="chevronRight" size={16} /></Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Recebido" value={brl(fin.billedPaid)} tone="green" hint="mensalidades do mês pagas" />
        <Stat label="A receber" value={brl(fin.open)} hint="no prazo" />
        <Stat label="Atrasado (mês)" value={brl(fin.late)} tone={fin.late ? "red" : "default"} />
        <Stat label="Despesas" value={brl(fin.expense)} />
        <Stat label="Saldo do caixa" value={brl(saldo)} tone={saldo >= 0 ? "green" : "red"} hint="entradas − saídas" />
      </div>

      {!asaasReady && (
        <div className="mt-4">
          <Notice tone="blue">
            Cobrança automática (Pix, cartão e boleto com baixa sozinha) entra quando a integração com o Asaas for ativada. Por enquanto, envie a cobrança pelo WhatsApp com sua chave Pix
            {tenant.pixKey ? "" : " (cadastre-a em Minha marca)"} e marque como recebido.
          </Notice>
        </div>
      )}

      <div className="mt-6">
        <Tabs
          active={aba}
          tabs={[
            { key: "cobrancas", label: "Cobranças do mês", href: q("&aba=cobrancas"), count: invoices.length },
            { key: "atrasadas", label: "Inadimplentes", href: q("&aba=atrasadas"), count: overdue.length },
            { key: "lancamentos", label: "Entradas e saídas", href: q("&aba=lancamentos"), count: ledger.length },
          ]}
        />
      </div>

      {aba === "cobrancas" && (
        <div className="space-y-4">
          <Disclosure label="Cobrança avulsa" variant="secondary">
            <form action={createInvoice} className="grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="back" value={back} />
              <Field label="Aluno" className="sm:col-span-2">
                <Select name="studentId" required>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              </Field>
              <Field label="Valor"><Input name="amount" inputMode="decimal" required placeholder="0,00" /></Field>
              <Field label="Vencimento"><Input type="date" name="dueDate" defaultValue={todayLocal()} /></Field>
              <Field label="Descrição" className="sm:col-span-3"><Input name="description" placeholder="Ex.: Aula avulsa" /></Field>
              <div className="flex items-end"><SubmitButton className="w-full">Criar</SubmitButton></div>
            </form>
          </Disclosure>
          <Card>
            {invoices.length === 0 ? (
              <EmptyState icon="receipt" title="Nenhuma cobrança neste mês" text="Use “Gerar mensalidades” para criar as cobranças dos planos recorrentes." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {invoices.map(({ invoice: i, student }) => {
                  const t = invoiceTone(i.status, i.dueDate);
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                      <Avatar name={student.name} size={36} color={tenant.primaryColor} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/painel/alunos/${student.id}?aba=financeiro`} className="block truncate font-medium text-zinc-900 hover:underline">{student.name}</Link>
                        <p className="truncate text-sm text-zinc-500">
                          {i.description} · {brl(i.amountCents)} · vence {fmtDayMonth(i.dueDate)}
                          {i.paidAt ? ` · pago ${fmtDayMonth(i.paidAt)}${i.method ? ` (${METHOD_LABEL[i.method]})` : ""}` : ""}
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
      )}

      {aba === "atrasadas" && (
        <Card title={`Total em atraso: ${brl(lateAll)}`}>
          {overdue.length === 0 ? (
            <EmptyState icon="check" title="Nenhum aluno inadimplente" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {overdue.map(({ invoice: i, student }) => {
                const days = Math.floor((Date.now() - i.dueDate.getTime()) / 86_400_000);
                return (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                    <Avatar name={student.name} size={36} color={tenant.primaryColor} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/painel/alunos/${student.id}?aba=financeiro`} className="block truncate font-medium text-zinc-900 hover:underline">{student.name}</Link>
                      <p className="text-sm text-red-600">{brl(i.amountCents)} · {days} dia(s) de atraso · {i.description}</p>
                    </div>
                    <InvoiceActions invoice={i} back={back} phone={student.phone} name={student.name} tenant={tenant} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {aba === "lancamentos" && (
        <div className="space-y-4">
          <Disclosure label="Novo lançamento" variant="secondary">
            <form action={createLedgerEntry} className="grid gap-3 sm:grid-cols-5">
              <Field label="Tipo">
                <Select name="type" defaultValue="EXPENSE">
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </Select>
              </Field>
              <Field label="Categoria">
                <Select name="category">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  <option>Mensalidades</option>
                  <option>Outras receitas</option>
                </Select>
              </Field>
              <Field label="Valor"><Input name="amount" inputMode="decimal" required placeholder="0,00" /></Field>
              <Field label="Data"><Input type="date" name="date" defaultValue={todayLocal()} /></Field>
              <Field label="Descrição"><Input name="description" /></Field>
              <div className="sm:col-span-5"><SubmitButton>Lançar</SubmitButton></div>
            </form>
          </Disclosure>
          <Card>
            {ledger.length === 0 ? (
              <EmptyState icon="wallet" title="Nenhum lançamento neste mês" />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {ledger.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${l.type === "INCOME" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"}`}>
                      <Icon name={l.type === "INCOME" ? "trend" : "receipt"} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{l.description ?? l.category}</p>
                      <p className="text-xs text-zinc-500">{l.category} · {fmtDate(l.date)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${l.type === "INCOME" ? "text-emerald-600" : "text-zinc-900"}`}>
                      {l.type === "INCOME" ? "+" : "−"} {brl(l.amountCents)}
                    </span>
                    {!l.invoiceId && (
                      <form action={deleteLedgerEntry}>
                        <input type="hidden" name="id" value={l.id} />
                        <DangerConfirm label="" confirmLabel="Excluir" />
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
