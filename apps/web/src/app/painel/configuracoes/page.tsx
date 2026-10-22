import { eq } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { studentAppUrl } from "@/lib/queries";
import { saveBrand } from "@/app/actions/painel";
import { CopyButton, SubmitButton } from "@/components/client";
import { Badge, Card, Field, Input, LinkButton, Notice, PageHeader, Textarea } from "@/components/ui";
import { brl, fmtDate } from "@/lib/format";

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const { salvo } = await searchParams;
  const { db, tenant } = await requireOwner();
  const [sub] = await db.select().from(S.platformSubscriptions).where(eq(S.platformSubscriptions.tenantId, tenant.id));
  const appUrl = studentAppUrl(tenant.slug);
  const asaas = Boolean(process.env.ASAAS_API_KEY);

  return (
    <>
      <PageHeader title="Minha marca" subtitle="Como seus alunos veem o seu app." actions={<LinkButton href={`/t/${tenant.slug}`} external variant="secondary" icon="link">Abrir app do aluno</LinkButton>} />
      {salvo && <div className="mb-4"><Notice tone="green">Configurações salvas.</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <form action={saveBrand} className="space-y-6 lg:col-span-2">
          <Card title="Identidade visual">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nome do app / negócio" className="sm:col-span-2"><Input name="name" defaultValue={tenant.name} required /></Field>
              <Field label="Cor principal" hint="Cabeçalho e destaques">
                <div className="flex gap-2"><input type="color" name="primaryColor" defaultValue={tenant.primaryColor} className="h-11 w-14 cursor-pointer rounded-lg border border-zinc-200" /><Input value={tenant.primaryColor} readOnly className="font-mono" /></div>
              </Field>
              <Field label="Cor de destaque" hint="Botões">
                <div className="flex gap-2"><input type="color" name="accentColor" defaultValue={tenant.accentColor} className="h-11 w-14 cursor-pointer rounded-lg border border-zinc-200" /><Input value={tenant.accentColor} readOnly className="font-mono" /></div>
              </Field>
              <Field label="Logo (link https da imagem)" hint="Upload de arquivo chega na próxima versão" className="sm:col-span-2"><Input name="logoUrl" type="url" defaultValue={tenant.logoUrl ?? ""} placeholder="https://…/logo.png" /></Field>
            </div>
          </Card>
          <Card title="Perfil e recebimento">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="WhatsApp de contato"><Input name="whatsapp" defaultValue={tenant.whatsapp ?? ""} placeholder="(11) 99999-9999" /></Field>
              <Field label="CREF"><Input name="cref" defaultValue={tenant.cref ?? ""} /></Field>
              <Field label="Chave Pix" hint="Aparece nas cobranças enviadas e no app do aluno" className="sm:col-span-2"><Input name="pixKey" defaultValue={tenant.pixKey ?? ""} placeholder="CPF, e-mail, telefone ou chave aleatória" /></Field>
              <Field label="Apresentação" className="sm:col-span-2"><Textarea name="bio" defaultValue={tenant.bio ?? ""} placeholder="Conte em poucas linhas como você trabalha." /></Field>
              <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
                <input type="checkbox" name="feePassThrough" defaultChecked={tenant.feePassThrough} /> Repassar taxas de pagamento online ao aluno (quando a cobrança automática estiver ativa)
              </label>
            </div>
          </Card>
          <SubmitButton icon="check">Salvar alterações</SubmitButton>
        </form>

        <div className="space-y-6">
          <Card title="Pré-visualização">
            <div className="p-5">
              <div className="overflow-hidden rounded-3xl border border-zinc-200 shadow-sm">
                <div className="px-4 py-4 text-white" style={{ background: tenant.primaryColor }}>
                  <div className="flex items-center gap-2">
                    {tenant.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded-lg bg-white object-contain" />
                    ) : (
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-sm font-bold">{tenant.name[0]}</span>
                    )}
                    <span className="text-sm font-semibold">{tenant.name}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold">Olá, Ana!</p>
                </div>
                <div className="space-y-2 bg-zinc-50 p-4">
                  <div className="rounded-xl bg-white p-3 text-sm shadow-sm"><p className="font-medium">Treino de hoje</p><p className="text-xs text-zinc-500">Treino A · Inferiores</p></div>
                  <button type="button" className="w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: tenant.accentColor }}>Pagar mensalidade</button>
                </div>
              </div>
            </div>
          </Card>
          <Card title="Endereço do seu app">
            <div className="space-y-3 p-5">
              <p className="break-all rounded-xl bg-zinc-100 px-3 py-2 font-mono text-xs">{appUrl}</p>
              <CopyButton text={appUrl} label="Copiar endereço" />
              <p className="text-xs text-zinc-500">No celular, o aluno pode “Adicionar à tela inicial” e o app abre com o seu nome e ícone.</p>
            </div>
          </Card>
          <Card title="Assinatura">
            <div className="space-y-2 p-5 text-sm">
              <div className="flex items-center justify-between"><span className="text-zinc-500">Plano</span><span className="font-medium">{sub?.tier ?? "—"} · {brl(sub?.priceCents)}/mês</span></div>
              <div className="flex items-center justify-between"><span className="text-zinc-500">Situação</span>{sub?.status === "TRIALING" ? <Badge tone="green">Teste até {fmtDate(sub.trialEndsAt)}</Badge> : <Badge>{sub?.status ?? "—"}</Badge>}</div>
              <div className="flex items-center justify-between"><span className="text-zinc-500">Cobrança automática</span>{asaas && tenant.paymentsEnabled ? <Badge tone="green">Ativa</Badge> : <Badge tone="yellow">Em breve</Badge>}</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
