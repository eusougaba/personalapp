import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { Icon } from "@/components/icons";

export const metadata = { title: "Treinos" };

export default async function Treinos({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  const { db, student } = ctx;
  const workouts = await db.select().from(S.workouts).where(and(eq(S.workouts.studentId, student.id), eq(S.workouts.active, true))).orderBy(asc(S.workouts.name));
  const ids = workouts.map((w) => w.id);
  const [counts, logs] = await Promise.all([
    ids.length ? db.select({ workoutId: S.workoutItems.workoutId, n: sql<number>`count(*)::int` }).from(S.workoutItems).where(inArray(S.workoutItems.workoutId, ids)).groupBy(S.workoutItems.workoutId) : [],
    ids.length ? db.select().from(S.workoutLogs).where(inArray(S.workoutLogs.workoutId, ids)).orderBy(desc(S.workoutLogs.completedAt)) : [],
  ]);
  const monthCount = logs.filter((l) => l.completedAt.getTime() > Date.now() - 30 * 86_400_000).length;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Meus treinos</h1>
      <div className="rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
        <p className="text-sm text-zinc-500">Treinos nos últimos 30 dias</p>
        <p className="text-3xl font-semibold">{monthCount}</p>
      </div>
      {workouts.length === 0 && <p className="text-sm text-zinc-500">Seu personal ainda não montou seus treinos.</p>}
      {workouts.map((w) => {
        const last = logs.find((l) => l.workoutId === w.id);
        return (
          <Link key={w.id} href={`/t/${slug}/treinos/${w.id}`} className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
            <span className="grid h-11 w-11 place-items-center rounded-2xl text-white" style={{ background: "var(--brand)" }}><Icon name="dumbbell" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{w.name}</p>
              <p className="text-sm text-zinc-500">{Number(counts.find((c) => c.workoutId === w.id)?.n ?? 0)} exercícios · {last ? `feito em ${fmtDate(last.completedAt)}` : "ainda não feito"}</p>
            </div>
            <Icon name="chevronRight" className="text-zinc-400" />
          </Link>
        );
      })}
    </div>
  );
}
