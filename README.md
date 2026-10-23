# PersonalApp (nome provisório)

Plataforma white label para personal trainers: alunos, planos, agenda, treinos, avaliações e cobranças, com um app para o aluno com a marca do personal.
Web app responsivo (PWA); apps Android/iOS depois, reaproveitando o mesmo código.

Piloto: personal **Felipe Astur**.

## O que já funciona

**Painel do personal** (`/painel`)
- Início: alunos ativos, recebido/a receber/atrasado, aulas de hoje, inadimplentes com cobrança pelo WhatsApp, fluxo de caixa de 6 meses, aniversariantes, alunos sem treino
- Alunos: busca, filtros por status, ficha com abas (resumo, plano, financeiro, treinos, avaliações, presença, dados), convite de acesso por WhatsApp
- Planos: recorrente (mensal/trimestral/semestral/anual), pacote de aulas, aula avulsa, consultoria online; valor, vencimento, desconto, multa
- Financeiro: gerar mensalidades do mês (sem duplicar), cobrança avulsa, marcar recebido, cancelar, inadimplentes, entradas e despesas, saldo do caixa
- Agenda: semana, aulas recorrentes, aulas em dupla/grupo, presença e falta (desconta saldo de pacote), cancelar aula ou série, confirmação por WhatsApp
- Treinos: biblioteca com 63 exercícios com imagem de execução, filtros por músculo e equipamento, exercícios próprios, montagem de ficha com séries/reps/carga/descanso editáveis, copiar treino para outro aluno
- Evolução de carga por exercício (primeira, última, recorde e tendência) a partir do que o aluno registra
- Anamnese respondida pelo aluno no primeiro acesso, com alerta de saúde na ficha
- Avaliações: peso, % gordura, medidas, gráficos de evolução
- Minha marca: nome, cores, logo, WhatsApp, CREF, chave Pix, pré-visualização

**App do aluno** (`/t/<personal>` ou `<personal>.dominio`)
- Convite com criação de senha e consentimento LGPD
- Questionário de anamnese obrigatório no primeiro acesso
- Treino do dia (sequência A → B → C) em modo execução: carga e repetições por série, cronômetro de descanso com aviso, "última vez" de cada exercício, progresso salvo se a página recarregar
- Minhas cargas: evolução por exercício
- Agenda, pagamentos com chave Pix e "já paguei", evolução
- PWA com nome, cor e ícone do personal

## Rodar no computador

Requisitos: Node 20+ (testado com 22 e 24).

```bash
cd apps/web
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem configurar nada, o app usa um **Postgres embutido** (pasta `apps/web/.data`) já com dados de demonstração:

| Perfil | Endereço | Login |
| --- | --- | --- |
| Personal (Felipe) | `http://localhost:3000/entrar` | já vem preenchido |
| Aluna (Ana) | `http://localhost:3000/t/felipe` | já vem preenchido |

Para zerar os dados de demonstração, apague a pasta `apps/web/.data`.

## Usar o Supabase

1. Copie `apps/web/.env.example` para `apps/web/.env.local`.
2. Use a integração **Supabase ↔ Vercel** (cria `POSTGRES_URL` sozinha) ou, manualmente, copie a URI do **Transaction pooler** (porta 6543) em `DATABASE_URL`. Se as duas existirem, `POSTGRES_URL` tem prioridade.
3. Gere um segredo para `AUTH_SECRET` (ex.: `openssl rand -base64 32`).
4. `npm run db:migrate` (aplica migrações pendentes; as atuais já estão aplicadas) e, opcionalmente, `npm run db:seed` para criar o personal de demonstração.

## Publicar

- **App:** Vercel, com Root Directory `apps/web` e as variáveis do `.env.example`.
- **Site institucional:** pasta `site/`, publicado no GitHub Pages pelo workflow `pages.yml`. Ajuste `APP_URL` no fim de `site/index.html` para o endereço do app.

## Estrutura

```
apps/web/
  db/migrations/       SQL versionado (aplicado no Supabase e no banco local)
  src/db/              schema Drizzle, conexão, migrador, dados de demonstração
  src/app/painel/      painel do personal
  src/app/t/[tenant]/  app do aluno (white label)
  src/app/actions/     server actions (toda escrita filtra pelo personal logado)
  src/lib/             auth, consultas, formatação, pagamentos (Asaas)
site/                  site institucional estático (GitHub Pages)
docs/                  arquitetura, business plan e decisões (ADRs)
```

## Fluxo de trabalho Git

- `main` sempre publicável.
- Uma branch por funcionalidade: `feat/cobranca-asaas`, `fix/agenda`.
- Pull request com CI verde antes do merge; Conventional Commits (`feat:`, `fix:`, `docs:`).
- Decisões de arquitetura em `docs/adr/`.

## Créditos

Imagens dos exercícios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público). Organização por grupo muscular inspirada no MuscleWiki. Para regerar: `python3 apps/web/scripts/exercise-library.py <pasta do free-exercise-db>`.
