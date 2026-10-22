# ADR 0001 — Monólito modular em Next.js com PWA

- Status: aceita
- Data: 2026-10-21

## Contexto

Precisamos validar o produto com um personal piloto rapidamente, com custo baixo, em web responsivo, e depois ter apps Android/iOS.

## Decisão

- Um único app Next.js (TypeScript) para personal, aluno e admin, organizado em módulos.
- PWA para o aluno instalar na tela inicial sem loja.
- PostgreSQL + Prisma; hospedagem na Vercel.
- Apps nativos no futuro via Capacitor reaproveitando o mesmo front-end.

## Consequências

- Um deploy e um repositório: velocidade alta no MVP.
- Fronteiras entre módulos precisam ser respeitadas para permitir extração futura.
- Recursos nativos avançados (ex.: wearables) podem exigir React Native mais adiante.
