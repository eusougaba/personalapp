import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { sessionsBetween } from "@/lib/queries";
import { cancelSession, createSessions, setAttendance } from "@/app/actions/painel";
import { Disclosure, SubmitButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { Badge, Card, Field, Input, PageHeader, Select, cx } from "@/components/ui";
import { addDays, fmtDayMonth, fmtWeekday, fromLocal, startOfWeek, toLocalDate, toLocalTime, todayLocal, whatsappLink } from "@/lib/format";

export default async function Agenda({ searchParams }: { searchParams: Promise<{ semana?: string; nova?: string; aluno?: string }> }) {
  const sp = await searchParams;
  const { db, tenant } = await requireOwner();
  const today = todayLocal();
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(sp.semana ?? "") ? sp.semana! : today;
  const monday = startOfWeek(ref);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const [sessions, students] = await Promise.all([
    sessionsBetween(db, tenant.id, fromLocal(monday, "00:00"), fromLocal(addDays(monday, 7), "00:00")),
    db
      .select({ id: S.students.id, name: S.students.name })
      .from(S.students)
      .where(and(eq(S.students.tenantId, tenant.id), inArray(S.students.status, ["ACTIVE", "INVITED"])))
      .orderBy(asc(S.students.name)),
  ]);
  const active = sessions.filter((s) => s.status !== "CANCELED");
  const now = new Date();
  const pendingMarks = active.filter((s) => s.endsAt < now && s.people.some((p) => p.att.present == null)).length;

  return (
    <>
      <PageHeader title="Agenda" subtitle={`${active.length} aula(s) nesta semana${pendingMarks ? ` · ${pendingMarks} sem registro de presença` : ""}`} />

      <div className="mb-5">
        <Disclosure label="Agendar aula" defaultOpen={Boolean(sp.nova)}>
          <form action={createSessions} className="grid gap-3 sm:grid-cols-6">
            <Field label="Aluno(s)" className="sm:col-span-6" hint="Segure Ctrl (ou Cmd) para escolher mais de um, em aulas em dupla ou grupo.">
              <Select name="studentIds" multiple required size={Math.min(6, Math.max(3, students.length))} defaultValue={sp.aluno ? [sp.aluno] : undefined}>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Data" className="sm:col-span-2"><Input type="date" name="date" defaultValue={today} required /></Field>
            <Field label="Horário"><Input type="time" name="time" defaultValue="07:00" required /></Field>
            <Field label="Duração">
              <Select name="duration" defaultValue="60">
                {[30, 45, 50, 60, 75, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
              </Select>
            </Field>
            <Field label="Repetir" className="sm:col-span-2">
              <Select name="repeatWeeks" defaultValue="1">
                <option value="1">Não repetir</option>
                <option value="4">Toda semana · 4 semanas</option>
                <option value="8">Toda semana · 8 semanas</option>
                <option value="12">Toda semana · 12 semanas</option>
              </Select>
            </Field>
            <Field label="Local" className="sm:col-span-3"><Input name="location" placeholder="Academia, parque, casa do aluno…" /></Field>
            <Field label="Título" className="sm:col-span-2"><Input name="title" placeholder="Treino personalizado" /></Field>
            <label className="flex items-end gap-2 pb-3 text-sm text-zinc-700"><input type="checkbox" name="online" /> Online</label>
            <div className="sm:col-span-6"><SubmitButton icon="calendar">Agendar</SubmitButton></div>
          </form>
        </Disclosure>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Link href={`/painel/agenda?semana=${addDays(monday, -7)}`} className="rounded-lg border border-zinc-200 bg-white p-2 hover:bg-zinc-50" aria-label="Semana anterior"><Icon name="chevronLeft" size={16} /></Link>
        <span className="min-w-48 text-center text-sm font-medium">{fmtDayMonth(fromLocal(monday))} – {fmtDayMonth(fromLocal(addDays(monday, 6)))}</span>
        <Link href={`/painel/agenda?semana=${addDays(monday, 7)}`} className="rounded-lg border border-zinc-200 bg-white p-2 hover:bg-zinc-50" aria-label="Próxima semana"><Icon name="chevronRight" size={16} /></Link>
        {monday !== startOfWeek(today) && <Link href="/painel/agenda" className="text-sm text-zinc-500 underline">Hoje</Link>}
      </div>

      <div className="grid gap-4 lg:grid-cols-7 lg:gap-2">
        {days.map((d) => {
          const list = sessions.filter((s) => toLocalDate(s.startsAt) === d);
          const isToday = d === today;
          return (
            <div key={d} className={cx("rounded-2xl border bg-white", isToday ? "border-zinc-900" : "border-zinc-200")}>
              <div className={cx("flex items-baseline justify-between border-b px-3 py-2 lg:block", isToday ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-100")}>
                <span className="text-sm font-semibold first-letter:uppercase">{fmtWeekday(fromLocal(d)).split("-")[0]}</span>
                <span className={cx("text-xs lg:block", isToday ? "text-zinc-300" : "text-zinc-500")}>{fmtDayMonth(fromLocal(d))}</span>
              </div>
              <div className="space-y-2 p-2">
                {list.length === 0 && <p className="px-1 py-2 text-xs text-zinc-400">Livre</p>}
                {list.map((s) => {
                  const past = s.endsAt < now;
                  const canceled = s.status === "CANCELED";
                  return (
                    <div key={s.id} className={cx("rounded-xl border p-2.5", canceled ? "border-dashed border-zinc-200 opacity-60" : "border-zinc-200 bg-zinc-50")}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold">{toLocalTime(s.startsAt)}</span>
                        {canceled ? <Badge>Cancelada</Badge> : s.recurrence ? <span title="Aula recorrente" className="text-[10px] text-zinc-400">↻</span> : null}
                      </div>
                      <p className="truncate text-xs text-zinc-500">{s.online ? "Online" : s.location ?? "—"}</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {s.people.map((p) => (
                          <li key={p.att.id}>
                            <div className="flex items-center justify-between gap-1">
                              <Link href={`/painel/alunos/${p.student.id}`} className="truncate text-xs font-medium text-zinc-800 hover:underline">{p.student.name}</Link>
                              {!past && !canceled && (
                                <a href={whatsappLink(p.student.phone, `Oi ${p.student.name.split(" ")[0]}! Confirmando nosso treino ${fmtWeekday(s.startsAt)} às ${toLocalTime(s.startsAt)}. Até lá!`)} target="_blank" rel="noopener noreferrer" className="text-emerald-600" title="Confirmar pelo WhatsApp">
                                  <Icon name="whatsapp" size={14} />
                                </a>
                              )}
                            </div>
                            {!canceled && (past || isToday) && (
                              <div className="mt-1 flex gap-1">
                                {([["1", "Presente"], ["0", "Faltou"]] as const).map(([v, label]) => {
                                  const on = (v === "1" && p.att.present === true) || (v === "0" && p.att.present === false);
                                  return (
                                    <form key={v} action={setAttendance} className="flex-1">
                                      <input type="hidden" name="sessionId" value={s.id} />
                                      <input type="hidden" name="studentId" value={p.student.id} />
                                      <input type="hidden" name="present" value={v} />
                                      <button
                                        className={cx(
                                          "w-full rounded-md px-1 py-1 text-[11px] font-medium",
                                          on ? (v === "1" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100",
                                        )}
                                      >
                                        {label}
                                      </button>
                                    </form>
                                  );
                                })}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      {!canceled && !past && (
                        <div className="mt-2 flex gap-2 text-[11px]">
                          <form action={cancelSession}>
                            <input type="hidden" name="id" value={s.id} />
                            <button className="text-zinc-400 hover:text-red-600">Cancelar</button>
                          </form>
                          {s.recurrence && (
                            <form action={cancelSession}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="all" value="1" />
                              <button className="text-zinc-400 hover:text-red-600">Cancelar série</button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <Card className="mt-6">
        <p className="px-5 py-4 text-sm text-zinc-500">
          Dica: ao marcar presença em aluno com <strong>pacote de aulas</strong>, o saldo de aulas é descontado automaticamente.
        </p>
      </Card>
    </>
  );
}
