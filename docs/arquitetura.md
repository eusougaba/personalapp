# Arquitetura

Documento vivo com diagramas: ver o doc "Plataforma para Personal Trainers — Business Plan e Arquitetura" no Claude.

## Visão geral

Monólito modular em Next.js na Vercel. Um único app atende três perfis:

- **Personal** (dono do tenant): gestão de alunos, planos, cobranças, agenda, treinos, avaliações e marca.
- **Aluno**: PWA com a marca do personal — treino do dia, agenda, faturas e evolução.
- **Admin da plataforma**: gestão dos personais e da assinatura SaaS.

## Multi-tenant

- Tenant resolvido pelo subdomínio (`felipe.dominio.com.br`) no `middleware.ts`.
- Toda tabela de negócio tem `tenantId`; o acesso ao banco usa um cliente Prisma com filtro de tenant obrigatório.
- Tema (cores, logo, nome) e manifesto do PWA gerados por tenant.
- Domínio próprio do personal entra depois, via CNAME + tabela `TenantDomain`.

## Módulos

| Módulo | Responsabilidade |
| --- | --- |
| tenants | Cadastro do personal, marca, assinatura SaaS |
| students | Alunos, convites, status |
| plans | Planos configuráveis (recorrente, pacote, avulsa, online) |
| billing | Assinaturas do aluno, faturas, integração com gateway, webhooks |
| finance | Painel recebido/a receber/atrasado, lançamentos manuais, previsão |
| schedule | Horários fixos, aulas avulsas, presença, reposição |
| workouts | Biblioteca de exercícios, fichas, registro de treino concluído |
| assessments | Medidas, peso, % gordura, fotos, evolução |
| auth | Login por link mágico, papéis (OWNER, TRAINER, STUDENT, PLATFORM_ADMIN) |

## Pagamentos

- Gateway: Asaas, com uma **subconta por personal** e split na origem.
- A plataforma nunca custodia o dinheiro do aluno: o valor cai na subconta do personal e a taxa (~1,5%) na conta da plataforma.
- Toda integração passa por `PaymentProvider` (`src/lib/payments/provider.ts`), permitindo trocar ou somar gateways.
- Webhooks são gravados em `WebhookEvent` (idempotência por `providerEventId`) e processados com retentativa.

## Segurança e LGPD

- Fotos e avaliações são dados sensíveis: armazenamento privado, URLs assinadas, consentimento do aluno registrado.
- Segredos só em variáveis de ambiente; nunca no repositório.
- `AuditLog` para ações financeiras e de acesso a dados sensíveis.

## Futuro

- Apps nativos: Capacitor empacotando o PWA; uma build por personal (white label na loja).
- Extração de serviços (billing, notificações) quando o volume justificar.
- IA para montagem de treinos e atendimento ao aluno.
