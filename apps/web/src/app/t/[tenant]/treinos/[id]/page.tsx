import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { completeWorkout } from "@/app/actions/aluno";
import { SubmitButton } from "@/components/client";
import { Textarea } from "@/components/ui";
import { ExerciseChecklist } from "./checklist";

export default async function TreinoAluno({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant: slug, id } = await params;
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  const { db, student } = ctx;
  const [w] = await db.select().from(S.workouts).where(and(eq(S.workouts.id, id), eq(S.workouts.studentId, student.id)));
  if (!w) notFound();
  const items = await db
    .select({ item: S.workoutItems, ex: S.exercises })
    .from(S.workoutItems)
    .innerJoin(S.exercises, eq(S.exercises.id, S.workoutItems.exerciseId))
    .where(eq(S.workoutItems.workoutId, id))
    .orderBy(asc(S.workoutItems.order));

  return (
    <div className="space-y-4">
      <a href={`/t/${slug}/treinos`} className="text-sm text-zinc-500">← Treinos</a>
      <h1 className="text-2xl font-semibold tracking-tight">{w.name}</h1>
      {w.notes && <p className="rounded-2xl bg-white p-4 text-sm text-zinc-600 ring-1 ring-zinc-200">{w.notes}</p>}
      <ExerciseChecklist
        items={items.map(({ item, ex }) => ({
          id: item.id,
          name: ex.name,
          detail: [item.sets && `${item.sets} séries`, item.reps && `${item.reps} reps`, item.load, item.restSeconds && `descanso ${item.restSeconds}s`].filter(Boolean).join(" · "),
          notes: item.notes ?? ex.instructions,
          videoUrl: ex.videoUrl,
        }))}
      />
      <form action={completeWorkout} className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="workoutId" value={id} />
        <p className="font-semibold">Terminou? Registre o treino</p>
        <label className="block text-sm text-zinc-600">
          Como foi o esforço? (1 leve – 10 máximo)
          <input type="range" name="effort" min={1} max={10} defaultValue={7} className="mt-2 w-full accent-[var(--accent)]" />
        </label>
        <Textarea name="comment" rows={2} placeholder="Algum comentário para o personal? (opcional)" />
        <SubmitButton variant="accent" className="w-full" pendingText="Registrando…">Concluir treino</SubmitButton>
      </form>
    </div>
  );
}
