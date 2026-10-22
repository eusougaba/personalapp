import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as S } from "@/db";
import { asaas } from "@/lib/payments/asaas";
import { id } from "@/lib/format";

// Webhook do Asaas: valida o token, grava o evento (idempotente) e dá baixa na fatura.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  let event;
  try {
    event = asaas.parseWebhook(req.headers, body);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const [seen] = await db.select({ id: S.webhookEvents.id }).from(S.webhookEvents).where(eq(S.webhookEvents.providerEventId, event.eventId));
  if (seen) return NextResponse.json({ received: true, duplicate: true });
  await db.insert(S.webhookEvents).values({ id: id(), provider: "asaas", providerEventId: event.eventId, type: event.type, payload: body as object });

  if (event.type !== "IGNORED") {
    const [inv] = await db.select().from(S.invoices).where(eq(S.invoices.providerPaymentId, event.providerPaymentId));
    if (inv) {
      if (event.type === "PAYMENT_CONFIRMED" && inv.status !== "PAID") {
        const paidAt = new Date();
        await db.update(S.invoices).set({ status: "PAID", paidAt, netCents: event.netCents ?? inv.amountCents }).where(eq(S.invoices.id, inv.id));
        await db.insert(S.ledgerEntries).values({ id: id(), tenantId: inv.tenantId, type: "INCOME", category: "Mensalidades", description: inv.description, amountCents: inv.amountCents, date: paidAt, invoiceId: inv.id });
      } else if (event.type === "PAYMENT_OVERDUE") {
        await db.update(S.invoices).set({ status: "OVERDUE" }).where(eq(S.invoices.id, inv.id));
      } else if (event.type === "PAYMENT_REFUNDED") {
        await db.update(S.invoices).set({ status: "REFUNDED" }).where(eq(S.invoices.id, inv.id));
      }
    }
  }
  await db.update(S.webhookEvents).set({ processedAt: new Date() }).where(eq(S.webhookEvents.providerEventId, event.eventId));
  return NextResponse.json({ received: true });
}
