import { and, asc, eq } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { createStudent } from "@/app/actions/painel";
import { SubmitButton } from "@/components/client";
import { Card, Field, Input, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { brl, todayLocal, PLAN_TYPE_LABEL } from "@/lib/format";

export default async function NovoAluno({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { db, tenant } = await requireOwner();
  const plans = await db.select().from(S.plans).where(and(eq(S.plans.tenantId, tenant.id), eq(S.plans.active, true))).orderBy(asc(S.plans.priceCents));
  const today = todayLocal();
  return (
    <>
      <PageHeader title="Novo aluno" back="/painel/alunos" subtitle="Depois de salvar, você envia o convite de acesso pelo WhatsApp." />
      {erro && <div className="mb-4"><Notice tone="red">Informe o nome do aluno.</Notice></div>}
      <form action={createStudent} className="grid gap-6 lg:grid-cols-2">
        <Card title="Dados do aluno">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Nome completo" className="sm:col-span-2">
              <Input name="name" required autoFocus />
            </Field>
            <Field label="WhatsApp">
              <Input name="phone" type="tel" placeholder="(11) 99999-9999" />
            </Field>
            <Field label="E-mail">
              <Input name="email" type="email" />
            </Field>
            <Field label="Data de nascimento">
              <Input name="birthDate" type="date" />
            </Field>
            <Field label="Objetivo">
              <Select name="goal" defaultValue="">
                <option value="">Selecione</option>
                {["Emagrecimento", "Hipertrofia", "Condicionamento", "Saúde e postura", "Reabilitação", "Corrida", "Performance esportiva", "Pós-parto", "Qualidade de vida"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </Field>
            <Field label="Observações (lesões, restrições, histórico)" className="sm:col-span-2">
              <Textarea name="notes" />
            </Field>
          </div>
        </Card>
        <Card title="Plano (opcional)">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {plans.length === 0 ? (
              <p className="text-sm text-zinc-500 sm:col-span-2">Você ainda não criou planos. Pode cadastrar o aluno agora e vincular o plano depois.</p>
            ) : (
              <>
                <Field label="Plano" className="sm:col-span-2">
                  <Select name="planId" defaultValue="">
                    <option value="">Sem plano por enquanto</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {brl(p.priceCents)} ({PLAN_TYPE_LABEL[p.type]})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Valor personalizado" hint="Deixe vazio para usar o valor do plano">
                  <Input name="price" inputMode="decimal" placeholder="0,00" />
                </Field>
                <Field label="Início">
                  <Input name="startDate" type="date" defaultValue={today} />
                </Field>
                <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
                  <input type="checkbox" name="firstInvoice" defaultChecked /> Gerar a primeira cobrança
                </label>
                <Field label="Vencimento da primeira cobrança">
                  <Input name="firstDue" type="date" defaultValue={today} />
                </Field>
              </>
            )}
          </div>
          <div className="border-t border-zinc-100 p-5">
            <SubmitButton className="w-full" icon="check">
              Salvar aluno
            </SubmitButton>
          </div>
        </Card>
      </form>
    </>
  );
}
