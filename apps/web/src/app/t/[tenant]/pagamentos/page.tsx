import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { CopyButton } from "@/components/client";
import { Badge, LinkButton, invoiceTone } from "@/components/ui";
import { METHOD_LABEL, brl, fmtDate, whatsappLink } from "@/lib/format";

export const metadata = { title: "Pagamentos" };

export default async function Pagamentos({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  const { db, tenant, student } = ctx;
  const invoices = await db.select().from(S.invoices).where(eq(S.invoices.studentId, student.id)).orderBy(desc(S.invoices.dueDate)).limit(24);
  const open = invoices.filter((i) => i.status === "PENDING" || i.status === "OVERDUE");
  const history = invoices.filter((i) => !(i.status === "PENDING" || i.status === "OVERDUE"));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Pagamentos</h1>
      {open.length === 0 ? (
        <div className="rounded-3xl bg-white p-5 text-center ring-1 ring-zinc-200">
          <p className="text-lg font-semibold">Tudo em dia ✅</p>
          <p className="text-sm text-zinc-500">Nenhuma mensalidade em aberto.</p>
        </div>
      ) : (
        open.map((i) => {
          const t = invoiceTone(i.status, i.dueDate);
          return (
            <div key={i.id} className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-zinc-500">{i.description}</p>
                  <p className="text-2xl font-semibold">{brl(i.amountCents)}</p>
                  <p className="text-sm text-zinc-500">Vencimento {fmtDate(i.dueDate)}</p>
                </div>
                <Badge tone={t.tone}>{t.label}</Badge>
              </div>
              {i.paymentUrl && <LinkButton href={i.paymentUrl} external variant="accent">Pagar agora</LinkButton>}
              {tenant.pixKey && (
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Pague por Pix com a chave</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-sm">{tenant.pixKey}</span>
                    <CopyButton text={tenant.pixKey} />
                  </div>
                </div>
              )}
              {tenant.whatsapp && (
                <LinkButton
                  href={whatsappLink(tenant.whatsapp, `Oi! Já fiz o pagamento de ${brl(i.amountCents)} (${i.description}). Segue o comprovante.`)}
                  external
                  variant="secondary"
                  icon="whatsapp"
                  size="sm"
                >
                  Já paguei: enviar comprovante
                </LinkButton>
              )}
            </div>
          );
        })
      )}
      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-500">Histórico</h2>
          <ul className="divide-y divide-zinc-100 rounded-3xl bg-white ring-1 ring-zinc-200">
            {history.map((i) => {
              const t = invoiceTone(i.status, i.dueDate);
              return (
                <li key={i.id} className="flex items-center justify-between gap-2 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{i.description}</p>
                    <p className="text-xs text-zinc-500">{brl(i.amountCents)}{i.paidAt ? ` · pago em ${fmtDate(i.paidAt)}` : ""}{i.method ? ` · ${METHOD_LABEL[i.method]}` : ""}</p>
                  </div>
                  <Badge tone={t.tone}>{t.label}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
