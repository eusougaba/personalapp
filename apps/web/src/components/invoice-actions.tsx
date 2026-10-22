import { cancelInvoice, markInvoicePaid } from "@/app/actions/painel";
import { SubmitButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { btn } from "@/components/ui";
import type { Tenant } from "@/db/schema";
import type { Invoice } from "@/db/schema";
import { METHOD_LABEL, brl, fmtDate, whatsappLink } from "@/lib/format";

export function InvoiceActions({ invoice, back, phone, name, tenant }: { invoice: Invoice; back: string; phone: string | null; name: string; tenant: Tenant }) {
  if (invoice.status === "PAID" || invoice.status === "CANCELED" || invoice.status === "REFUNDED") return null;
  const msg = `Oi ${name.split(" ")[0]}! Segue a cobrança "${invoice.description}" de ${brl(invoice.amountCents)}, com vencimento em ${fmtDate(invoice.dueDate)}.${
    tenant.pixKey ? ` Pix: ${tenant.pixKey}.` : ""
  }${invoice.paymentUrl ? ` Pague aqui: ${invoice.paymentUrl}` : ""} Obrigado!`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={markInvoicePaid} className="flex items-center gap-1.5">
        <input type="hidden" name="id" value={invoice.id} />
        <input type="hidden" name="back" value={back} />
        <select name="method" defaultValue="PIX" className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs">
          {Object.entries(METHOD_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <SubmitButton variant="success" size="sm" icon="check" pendingText="…">Recebido</SubmitButton>
      </form>
      <a href={whatsappLink(phone, msg)} target="_blank" rel="noopener noreferrer" className={btn("secondary", "sm")}>
        <Icon name="whatsapp" size={14} /> Cobrar
      </a>
      <form action={cancelInvoice}>
        <input type="hidden" name="id" value={invoice.id} />
        <input type="hidden" name="back" value={back} />
        <SubmitButton variant="ghost" size="sm" pendingText="…">Cancelar</SubmitButton>
      </form>
    </div>
  );
}

