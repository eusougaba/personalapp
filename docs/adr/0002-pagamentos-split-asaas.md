# ADR 0002 — Pagamentos com split na origem (Asaas)

- Status: aceita (validar com contador/advogado antes do lançamento público)
- Data: 2026-10-21

## Contexto

O personal quer cobrar os alunos pelo app. A plataforma quer uma taxa sobre esse volume. Receber o dinheiro na conta da plataforma e repassar aproxima a empresa do papel de instituição de pagamento/subcredenciadora e concentra tributação.

## Decisão

- Usar Asaas com **uma subconta por personal** e **split na origem**: líquido na subconta do personal, taxa na conta da plataforma.
- Integração isolada na interface `PaymentProvider`, para poder somar Pagar.me ou Stripe Connect depois.
- Webhooks persistidos com idempotência antes do processamento.
- Assinatura SaaS do personal cobrada na conta principal da plataforma, também via Asaas.

## Consequências

- Sem custódia de recursos de terceiros pela plataforma.
- Personal precisa passar pelo KYC do gateway para ativar "Receber pelo app".
- Dependência de um gateway mitigada pela camada de abstração.
