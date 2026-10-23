import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { requireAnamnese } from "@/lib/student";
import { LoginForm } from "@/app/(auth)/forms";
import { CopyButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { Badge, LinkButton, Notice, invoiceTone } from "@/components/ui";
import { brl, fmtDate, fmtDayMonth, fmtWeekday, toLocalTime, whatsappLink } from "@/lib/format";
import { DEMO_STUDENT } from "@/db/seed";

export default async function AlunoHome({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ concluido?: string; bemvindo?: string }> }) {
  const { tenant: slug } = await params;
  const { concluido, bemvindo } = await searchParams;
  const ctx = await getStudentSession(slug);

  if (!ctx) {
    const db = await getDb();
    const [tenant] = await db.select().from(S.tenants).where(eq(S.tenants.slug, slug));
    if (!tenant) notFound();
    const demo = !(process.env.POSTGRES_URL || process.env.DATABASE_URL) && slug === "felipe";
    return (
      <div className="space-y-5">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h1 className="text-xl font-semibold">Área do aluno</h1>
          <p className="mt-1 text-sm text-zinc-500">{tenant.bio ?? `Entre para ver seus treinos, sua agenda e suas mensalidades com ${tenant.name}.`}</p>
          {tenant.cref && <p className="mt-2 text-xs text-zinc-400">CREF {tenant.cref}</p>}
          <div className="mt-5">
            {demo && <div className="mb-4"><Notice tone="green">Modo demonstração: login da aluna Ana já preenchido.</Notice></div>}
            <LoginForm next={`/t/${slug}`} demo={demo ? DEMO_STUDENT : undefined} />
          </div>
        </div>
        {tenant.whatsapp && (
          <a href={whatsappLink(tenant.whatsapp, `Olá! Quero saber mais sobre os treinos com ${tenant.name}.`)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-800">
            <Icon name="whatsapp" size={18} className="text-emerald-600" /> Ainda não é aluno? Fale comigo
          </a>
        )}
      </div>
    );
  }

  await requireAnamnese(ctx, slug);
  const { db, tenant, student } = ctx;
  const [workouts, next, open, lastLog] = await Promise.all([
    db.select().from(S.workouts).where(and(eq(S.workouts.studentId, student.id), eq(S.workouts.active, true))).orderBy(asc(S.workouts.name)),
    db
      .select({ s: S.classSessions })
      .from(S.attendances)
      .innerJoin(S.classSessions, eq(S.classSessions.id, S.attendances.sessionId))
      .where(and(eq(S.attendances.studentId, student.id), gte(S.classSessions.startsAt, new Date()), eq(S.classSessions.status, "SCHEDULED")))
      .orderBy(asc(S.classSessions.startsAt))
      .limit(1),
    db.select().from(S.invoices).where(and(eq(S.invoices.studentId, student.id), inArray(S.invoices.status, ["PENDING", "OVERDUE"]))).orderBy(asc(S.invoices.dueDate)),
    db
      .select({ workoutId: S.workoutLogs.workoutId, at: S.workoutLogs.completedAt })
      .from(S.workoutLogs)
      .innerJoin(S.workouts, eq(S.workouts.id, S.workoutLogs.workoutId))
      .where(eq(S.workouts.studentId, student.id))
      .orderBy(desc(S.workoutLogs.completedAt))
      .limit(1),
  ]);
  // Sugere o próximo treino da sequência (A → B → C…)
  const lastIdx = lastLog[0] ? workouts.findIndex((w) => w.id === lastLog[0]!.workoutId) : -1;
  const suggested = workouts.length ? workouts[(lastIdx + 1) % workouts.length] : null;
  const s = next[0]?.s;
  const first = student.name.split(" ")[0];
  const base = `/t/${slug}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-zinc-500">Bem-vindo(a) de volta</p>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {first}!</h1>
      </div>
      {bemvindo && <Notice tone="green">Respostas enviadas! Seu personal já pode montar seu treino com segurança.</Notice>}
      {concluido && <Notice tone="green">Treino registrado. Mandou bem! 💪</Notice>}

      {suggested ? (
        <Link href={`${base}/treinos/${suggested.id}`} className="block rounded-3xl p-5 text-white shadow-sm" style={{ background: tenant.primaryColor }}>
          <p className="text-sm text-white/70">Seu treino de hoje</p>
          <p className="mt-1 text-xl font-semibold">{suggested.name}</p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: tenant.accentColor }}>
            Começar treino <Icon name="chevronRight" size={16} />
          </span>
        </Link>
      ) : (
        <div className="rounded-3xl bg-white p-5 text-sm text-zinc-500 ring-1 ring-zinc-200">Seu personal ainda está montando seus treinos.</div>
      )}

      <div className="rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
        <p className="text-sm font-medium text-zinc-500">Próxima aula</p>
        {s ? (
          <>
            <p className="mt-1 text-lg font-semibold first-letter:uppercase">{fmtWeekday(s.startsAt)}, {fmtDayMonth(s.startsAt)} · {toLocalTime(s.startsAt)}</p>
            <p className="flex items-center gap-1 text-sm text-zinc-500"><Icon name="mapPin" size={14} />{s.online ? "Online" : s.location ?? "Local a combinar"}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-zinc-500">Nenhuma aula agendada.</p>
        )}
      </div>

      {open.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
          <p className="text-sm font-medium text-zinc-500">Mensalidade</p>
          {open.slice(0, 2).map((i) => {
            const t = invoiceTone(i.status, i.dueDate);
            return (
              <div key={i.id} className="mt-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{brl(i.amountCents)}</p>
                  <p className="text-xs text-zinc-500">{i.description} · vence {fmtDate(i.dueDate)}</p>
                </div>
                <Badge tone={t.tone}>{t.label}</Badge>
              </div>
            );
          })}
          {tenant.pixKey && (
            <div className="mt-4 rounded-2xl bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Chave Pix</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm">{tenant.pixKey}</span>
                <CopyButton text={tenant.pixKey} />
              </div>
            </div>
          )}
          <div className="mt-3">
            <LinkButton href={`${base}/pagamentos`} variant="accent" size="sm">Ver pagamentos</LinkButton>
          </div>
        </div>
      )}

      {tenant.whatsapp && (
        <a href={whatsappLink(tenant.whatsapp, `Oi! Aqui é ${first}.`)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-800">
          <Icon name="whatsapp" size={18} className="text-emerald-600" /> Falar com meu personal
        </a>
      )}
    </div>
  );
}
