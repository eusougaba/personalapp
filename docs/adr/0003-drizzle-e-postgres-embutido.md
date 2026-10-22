# ADR 0003 — Drizzle ORM e Postgres embutido no desenvolvimento

- Status: aceita (substitui a escolha de Prisma da ADR 0001)
- Data: 2026-10-21

## Contexto

O Prisma depende de binários baixados na instalação, o que falhou em ambientes restritos e complica rodar o projeto do zero. Queremos que qualquer pessoa rode o app com `npm install && npm run dev`, sem criar banco.

## Decisão

- **Drizzle ORM** (TypeScript puro, sem binários) mapeando as tabelas já criadas.
- **Migrações em SQL** em `apps/web/db/migrations`, aplicadas em ordem e registradas na tabela `_app_migrations`.
- **Sem `DATABASE_URL`:** Postgres embutido (PGlite) em `.data/`, com dados de demonstração.
- **Com `DATABASE_URL`:** Supabase via `postgres-js` (pooler, `prepare: false`).
- Autenticação própria: senha com bcrypt e sessão em cookie JWT `httpOnly`.
- RLS ligado sem políticas no Supabase: a API pública não acessa dados; só o servidor do app.

## Consequências

- Setup local sem dependências externas e testes ponta a ponta mais simples.
- Mudanças de esquema exigem escrever o SQL da migração e atualizar `src/db/schema.ts`.
