import { NextResponse } from "next/server";
import { asaas } from "@/lib/payments/asaas";

// Recebe eventos do Asaas. Fluxo previsto:
// 1. valida o token e normaliza o evento
// 2. grava em WebhookEvent (providerEventId único = idempotência)
// 3. atualiza Invoice (PAID/OVERDUE/REFUNDED) e cria LedgerEntry
// 4. responde 200 rápido; processamento pesado vai para fila
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event = asaas.parseWebhook(req.headers, body);
    // TODO(MVP): persistir WebhookEvent e atualizar Invoice via Prisma
    console.info("asaas webhook", event.type, event.eventId);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
}
