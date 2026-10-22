// Contrato único para gateways de pagamento.
// O resto do app conversa só com esta interface — nunca com o Asaas diretamente.

export type Method = "PIX" | "CREDIT_CARD" | "BOLETO";

export interface SubAccountInput {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}

export interface SplitRule {
  walletId: string; // carteira que recebe (plataforma)
  percentualValue?: number; // ex.: 1.5
  fixedValueCents?: number;
}

export interface ChargeInput {
  customerId: string;
  amountCents: number;
  dueDate: string; // YYYY-MM-DD
  method: Method;
  description: string;
  externalReference: string; // id da Invoice
  split?: SplitRule[];
}

export interface ChargeResult {
  providerPaymentId: string;
  paymentUrl?: string;
  pixCopyPaste?: string;
}

export type NormalizedEvent =
  | { type: "PAYMENT_CONFIRMED"; providerPaymentId: string; eventId: string; netCents?: number }
  | { type: "PAYMENT_OVERDUE"; providerPaymentId: string; eventId: string }
  | { type: "PAYMENT_REFUNDED"; providerPaymentId: string; eventId: string }
  | { type: "IGNORED"; eventId: string };

export interface PaymentProvider {
  createSubAccount(input: SubAccountInput): Promise<{ accountId: string; walletId: string; apiKey: string }>;
  createCustomer(apiKey: string, input: { name: string; email?: string; cpfCnpj?: string }): Promise<string>;
  createCharge(apiKey: string, input: ChargeInput): Promise<ChargeResult>;
  parseWebhook(headers: Headers, body: unknown): NormalizedEvent;
}
