import Link from "next/link";
import { and, asc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { Avatar, Badge, Card, EmptyState, Input, LinkButton, Notice, PageHeader, STUDENT_STATUS, Tabs } from "@/components/ui";
import { Icon } from "@/components/icons";
import { brl } from "@/lib/format";
import { startOfToday } from "@/lib/queries";

export default async function Alunos({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; removido?: string }> }) {
  const { q = "", status = "todos", removido } = await searchParams;
  const { db, tenant } = await requireOwner();

  const conds = [eq(S.students.tenantId, tenant.id)];
  if (["ACTIVE", "PAUSED", "INVITED", "INACTIVE"].includes(status)) conds.push(eq(S.students.status, status as "ACTIVE"));
  if (q) conds.push(or(ilike(S.students.name, `%${q}%`), ilike(S.students.email, `%${q}%`), ilike(S.students.phone, `%${q}%`))!);

  const rows = await db.select().from(S.students).where(and(...conds)).orderBy(asc(S.students.name));
  const ids = rows.map((r) => r.id);
  const [subs, late, counts] = await Promise.all([
    ids.length
      ? db
          .select({ studentId: S.subscriptions.studentId, plan: S.plans.name, price: S.subscriptions.priceCents, left: S.subscriptions.sessionsLeft })
          .from(S.subscriptions)
          .innerJoin(S.plans, eq(S.plans.id, S.subscriptions.planId))
          .where(and(inArray(S.subscriptions.studentId, ids), inArray(S.subscriptions.status, ["ACTIVE", "PAUSED"])))
      : [],
    ids.length
      ? db
          .select({ studentId: S.invoices.studentId, total: sql<number>`sum(${S.invoices.amountCents})::int` })
          .from(S.invoices)
          .where(and(inArray(S.invoices.studentId, ids), inArray(S.invoices.status, ["PENDING", "OVERDUE"]), lt(S.invoices.dueDate, startOfToday())))
          .groupBy(S.invoices.studentId)
      : [],
    db
      .select({ status: S.students.status, n: sql<number>`count(*)::int` })
      .from(S.students)
      .where(eq(S.students.tenantId, tenant.id))
      .groupBy(S.students.status),
  ]);
  const c = (k: string) => Number(counts.find((x) => x.status === k)?.n ?? 0);
  const all = counts.reduce((a, x) => a + Number(x.n), 0);
  const qs = (s: string) => `/painel/alunos?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader title="Alunos" subtitle={`${all} cadastrados`} actions={<LinkButton href="/painel/alunos/novo" icon="plus">Novo aluno</LinkButton>} />
      {removido && <div className="mb-4"><Notice tone="green">Aluno removido.</Notice></div>}
      <Tabs
        active={status}
        tabs={[
          { key: "todos", label: "Todos", href: qs("todos"), count: all },
          { key: "ACTIVE", label: "Ativos", href: qs("ACTIVE"), count: c("ACTIVE") },
          { key: "INVITED", label: "Convidados", href: qs("INVITED"), count: c("INVITED") },
          { key: "PAUSED", label: "Pausados", href: qs("PAUSED"), count: c("PAUSED") },
          { key: "INACTIVE", label: "Inativos", href: qs("INACTIVE"), count: c("INACTIVE") },
        ]}
      />
      <form className="mb-4 flex gap-2" action="/painel/alunos">
        <input type="hidden" name="status" value={status} />
        <div className="relative flex-1">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail ou telefone" className="pl-9" />
        </div>
      </form>
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title={q ? "Nenhum aluno encontrado" : "Nenhum aluno ainda"}
            text={q ? "Tente outro nome." : "Cadastre seu primeiro aluno e envie o convite pelo WhatsApp."}
            action={!q && <LinkButton href="/painel/alunos/novo" icon="plus">Cadastrar aluno</LinkButton>}
          />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map((s) => {
              const sub = subs.find((x) => x.studentId === s.id);
              const debt = late.find((x) => x.studentId === s.id)?.total;
              const st = STUDENT_STATUS[s.status]!;
              return (
                <li key={s.id}>
                  <Link href={`/painel/alunos/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 sm:px-5">
                    <Avatar name={s.name} color={tenant.primaryColor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900">{s.name}</p>
                      <p className="truncate text-sm text-zinc-500">
                        {sub ? `${sub.plan} · ${brl(sub.price)}${sub.left != null ? ` · ${sub.left} aulas restantes` : ""}` : "Sem plano"}
                        {s.goal ? ` · ${s.goal}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {debt ? <span className="text-xs font-medium text-red-600">{brl(Number(debt))} em atraso</span> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
