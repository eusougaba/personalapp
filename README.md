# Personal App (nome provisório)

Plataforma white label para personal trainers gerirem alunos, planos, aulas, treinos e **cobranças com split automático**.
Web app responsivo (PWA) primeiro; apps Android/iOS depois, reaproveitando o mesmo código.

Piloto: personal **Felipe Astur**.

## Status

Fase 0 — Fundação. Este repositório contém o esqueleto do projeto, o modelo de dados e a documentação de decisões.

## Stack

| Camada | Escolha |
| --- | --- |
| Web | Next.js (App Router) + TypeScript + Tailwind, PWA |
| Banco | PostgreSQL gerenciado (Neon ou Supabase, região São Paulo) + Prisma |
| Auth | Auth.js (login por link no e-mail) |
| Pagamentos | Asaas (subcontas + split) atrás da interface `PaymentProvider` |
| Hospedagem | Vercel |
| Mobile (futuro) | Capacitor empacotando o PWA |

## Estrutura

```
apps/web/            Web app Next.js (personal, aluno e admin no mesmo app)
  src/app/           Rotas (App Router)
  src/lib/tenant.ts  Resolução do tenant pelo subdomínio
  src/lib/payments/  Interface PaymentProvider + implementação Asaas
  src/middleware.ts  Middleware multi-tenant
  prisma/            Modelo de dados (schema.prisma)
docs/                Arquitetura, business plan e decisões (ADRs)
.github/workflows/   CI
```

## Como rodar (após instalar dependências)

```bash
cd apps/web
cp .env.example .env.local   # preencher DATABASE_URL e chaves do Asaas (sandbox)
npm install
npx prisma migrate dev
npm run dev
```

Para testar multi-tenant localmente: acesse `http://felipe.localhost:3000`.

## Fluxo de trabalho Git

- `main` sempre publicável; deploy automático na Vercel.
- Uma branch por funcionalidade: `feat/planos`, `fix/webhook-asaas`.
- Pull request com preview da Vercel e CI verde antes do merge.
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Decisões de arquitetura registradas em `docs/adr/`.
