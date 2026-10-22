// Implementação Asaas do PaymentProvider (esqueleto — validar endpoints no sandbox).
// Docs: https://docs.asaas.com
import type { ChargeInput, ChargeResult, NormalizedEvent, PaymentProvider, SubAccountInput } from "./provider";

const BASE_URL = process.env.ASAAS_BASE_URL ?? "https://api-sandbox.asaas.com/v3";

async function call<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", access_token: apiKey, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Asaas ${path} -> ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

const toReais = (cents: number) => Math.round(cents) / 100;

export const asaas: PaymentProvider = {
  async createSubAccount(input: SubAccountInput) {
    // Subconta criada com a chave da conta principal (plataforma)
    const data = await call<{ id: string; walletId: string; apiKey: string }>(
      process.env.ASAAS_API_KEY!,
      "/accounts",
      { method: "POST", body: JSON.stringify({ ...input, mobilePhone: input.phone }) },
    );
    return { accountId: data.id, walletId: data.walletId, apiKey: data.apiKey };
  },

  async createCustomer(apiKey, input) {
    const data = await call<{ id: string }>(apiKey, "/customers", { method: "POST", body: JSON.stringify(input) });
    return data.id;
  },

  async createCharge(apiKey, input: ChargeInput): Promise<ChargeResult> {
    const body = {
      customer: input.customerId,
      billingType: input.method,
      value: toReais(input.amountCents),
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
      split: input.split?.map((s) => ({
        walletId: s.walletId,
        percentualValue: s.percentualValue,
        fixedValue: s.fixedValueCents ? toReais(s.fixedValueCents) : undefined,
      })),
    };
    const data = await call<{ id: string; invoiceUrl?: string }>(apiKey, "/payments", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { providerPaymentId: data.id, paymentUrl: data.invoiceUrl };
  },

  parseWebhook(headers, body): NormalizedEvent {
    // O Asaas envia um token configurado no painel; rejeitar se não bater.
    if (headers.get("asaas-access-token") !== process.env.ASAAS_WEBHOOK_TOKEN) {
      throw new Error("Webhook não autorizado");
    }
    const evt = body as { id: string; event: string; payment?: { id: string; netValue?: number } };
    const pid = evt.payment?.id ?? "";
    switch (evt.event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        return {
          type: "PAYMENT_CONFIRMED",
          providerPaymentId: pid,
          eventId: evt.id,
          netCents: evt.payment?.netValue ? Math.round(evt.payment.netValue * 100) : undefined,
        };
      case "PAYMENT_OVERDUE":
        return { type: "PAYMENT_OVERDUE", providerPaymentId: pid, eventId: evt.id };
      case "PAYMENT_REFUNDED":
        return { type: "PAYMENT_REFUNDED", providerPaymentId: pid, eventId: evt.id };
      default:
        return { type: "IGNORED", eventId: evt.id };
    }
  },
};
