import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { requireAnamnese } from "@/lib/student";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { fmtDayMonth, fmtWeekday, toLocalTime } from "@/lib/format";

export const metadata = { title: "Agenda" };

export default async function AgendaAluno({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  await requireAnamnese(ctx, slug);
  const { db, student } = ctx;
  const now = new Date();
  const base = db
    .select({ s: S.classSessions, a: S.attendances })
    .from(S.attendances)
    .innerJoin(S.classSessions, eq(S.classSessions.id, S.attendances.sessionId));
  const [upcoming, past] = await Promise.all([
    base.where(and(eq(S.attendances.studentId, student.id), gte(S.classSessions.startsAt, now))).orderBy(asc(S.classSessions.startsAt)).limit(20),
    db
      .select({ s: S.classSessions, a: S.attendances })
      .from(S.attendances)
      .innerJoin(S.classSessions, eq(S.classSessions.id, S.attendances.sessionId))
      .where(and(eq(S.attendances.studentId, student.id), lt(S.classSessions.startsAt, now)))
      .orderBy(desc(S.classSessions.startsAt))
      .limit(10),
  ]);
  const Row = ({ s, a }: { s: typeof S.classSessions.$inferSelect; a: typeof S.attendances.$inferSelect }) => (
    <li className="flex items-center justify-between gap-2 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
      <div>
        <p className="font-medium first-letter:uppercase">{fmtWeekday(s.startsAt)}, {fmtDayMonth(s.startsAt)}</p>
        <p className="flex items-center gap-1 text-sm text-zinc-500"><Icon name="clock" size={14} />{toLocalTime(s.startsAt)} · {s.online ? "Online" : s.location ?? "—"}</p>
      </div>
      {s.status === "CANCELED" ? <Badge>Cancelada</Badge> : a.present === true ? <Badge tone="green">Presente</Badge> : a.present === false ? <Badge tone="red">Falta</Badge> : s.startsAt > now ? <Badge tone="blue">Agendada</Badge> : null}
    </li>
  );
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Minha agenda</h1>
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Próximas aulas</h2>
        {upcoming.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma aula agendada.</p> : <ul className="space-y-2">{upcoming.map((r) => <Row key={r.s.id} {...r} />)}</ul>}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-500">Últimas aulas</h2>
          <ul className="space-y-2">{past.map((r) => <Row key={r.s.id} {...r} />)}</ul>
        </section>
      )}
    </div>
  );
}
