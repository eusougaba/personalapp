import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { requireAnamnese } from "@/lib/student";
import { WorkoutRunner, type RunnerItem } from "./runner";

export default async function TreinoAluno({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant: slug, id } = await params;
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  await requireAnamnese(ctx, slug);
  const { db, student } = ctx;
  const [w] = await db.select().from(S.workouts).where(and(eq(S.workouts.id, id), eq(S.workouts.studentId, student.id)));
  if (!w) notFound();
  const items = await db
    .select({ item: S.workoutItems, ex: S.exercises })
    .from(S.workoutItems)
    .innerJoin(S.exercises, eq(S.exercises.id, S.workoutItems.exerciseId))
    .where(eq(S.workoutItems.workoutId, id))
    .orderBy(asc(S.workoutItems.order));
  const exIds = [...new Set(items.map((i) => i.ex.id))];
  const history = exIds.length
    ? await db
        .select()
        .from(S.workoutSetLogs)
        .where(and(eq(S.workoutSetLogs.studentId, student.id), inArray(S.workoutSetLogs.exerciseId, exIds)))
        .orderBy(desc(S.workoutSetLogs.createdAt))
        .limit(400)
    : [];
  // Última sessão registrada de cada exercício
  const last = (exerciseId: string) => {
    const rows = history.filter((h) => h.exerciseId === exerciseId);
    const logId = rows[0]?.workoutLogId;
    return rows
      .filter((r) => r.workoutLogId === logId)
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((r) => ({ setNumber: r.setNumber, reps: r.reps, loadKg: r.loadKg == null ? null : Number(r.loadKg) }));
  };
  const runnerItems: RunnerItem[] = items.map(({ item, ex }) => ({
    itemId: item.id,
    exerciseId: ex.id,
    name: ex.name,
    images: ex.images ?? [],
    sets: item.sets ?? 3,
    reps: item.reps,
    load: item.load,
    restSeconds: item.restSeconds ?? 60,
    notes: item.notes,
    instructions: ex.instructions,
    cardio: ex.muscleGroup === "Cardio",
    last: last(ex.id),
  }));

  return (
    <div className="space-y-4">
      <a href={`/t/${slug}/treinos`} className="text-sm text-zinc-500">← Treinos</a>
      <h1 className="text-2xl font-semibold tracking-tight">{w.name}</h1>
      {w.notes && <p className="rounded-2xl bg-white p-4 text-sm text-zinc-600 ring-1 ring-zinc-200">{w.notes}</p>}
      <WorkoutRunner slug={slug} workoutId={id} items={runnerItems} />
    </div>
  );
}
