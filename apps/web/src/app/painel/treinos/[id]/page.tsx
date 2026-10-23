import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull, ne, or } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { MUSCLE_GROUPS } from "@/lib/exercises";
import { addWorkoutItem, deleteWorkout, duplicateWorkout, moveWorkoutItem, removeWorkoutItem, updateWorkout, updateWorkoutItem } from "@/app/actions/painel";
import { DangerConfirm, SubmitButton } from "@/components/client";
import { ExerciseImage } from "@/components/exercise-image";
import { Card, EmptyState, Field, Input, Notice, PageHeader, Select, Textarea, cx } from "@/components/ui";
import { Icon } from "@/components/icons";

const small = "w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm";

export default async function TreinoEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copiado?: string; grupo?: string; q?: string }>;
}) {
  const { id } = await params;
  const { copiado, grupo = "Peito", q = "" } = await searchParams;
  const { db, tenant } = await requireOwner();
  const [w] = await db
    .select({ workout: S.workouts, student: S.students })
    .from(S.workouts)
    .innerJoin(S.students, eq(S.students.id, S.workouts.studentId))
    .where(and(eq(S.workouts.id, id), eq(S.workouts.tenantId, tenant.id)));
  if (!w) notFound();
  const [items, library, others] = await Promise.all([
    db
      .select({ item: S.workoutItems, ex: S.exercises })
      .from(S.workoutItems)
      .innerJoin(S.exercises, eq(S.exercises.id, S.workoutItems.exerciseId))
      .where(eq(S.workoutItems.workoutId, id))
      .orderBy(asc(S.workoutItems.order)),
    db
      .select()
      .from(S.exercises)
      .where(or(isNull(S.exercises.tenantId), eq(S.exercises.tenantId, tenant.id)))
      .orderBy(asc(S.exercises.name)),
    db
      .select({ id: S.students.id, name: S.students.name })
      .from(S.students)
      .where(and(eq(S.students.tenantId, tenant.id), ne(S.students.id, w.student.id)))
      .orderBy(asc(S.students.name)),
  ]);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const picker = q ? library.filter((e) => norm(e.name).includes(norm(q))) : library.filter((e) => (e.muscleGroup ?? "Outros") === grupo);
  const groups = MUSCLE_GROUPS.filter((g) => library.some((e) => e.muscleGroup === g));
  const base = `/painel/treinos/${id}`;

  return (
    <>
      <PageHeader back={`/painel/alunos/${w.student.id}?aba=treinos`} title={w.workout.name} subtitle={`Treino de ${w.student.name} · ${items.length} exercício(s)`} />
      {copiado && <div className="mb-4"><Notice tone="green">Treino copiado para este aluno. Ajuste cargas e repetições se precisar.</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Exercícios do treino">
            {items.length === 0 ? (
              <EmptyState icon="dumbbell" title="Treino vazio" text="Escolha os exercícios na biblioteca ao lado." />
            ) : (
              <ol className="divide-y divide-zinc-100">
                {items.map(({ item, ex }, idx) => (
                  <li key={item.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
                    <div className="relative">
                      <ExerciseImage images={ex.images} name={ex.name} size="sm" />
                      <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">{idx + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-zinc-900">{ex.name}</p>
                        <div className="flex shrink-0 items-center">
                          {(["up", "down"] as const).map((dir) => (
                            <form key={dir} action={moveWorkoutItem}>
                              <input type="hidden" name="workoutId" value={id} />
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="dir" value={dir} />
                              <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30" disabled={(dir === "up" && idx === 0) || (dir === "down" && idx === items.length - 1)} aria-label={dir === "up" ? "Subir" : "Descer"}>
                                <Icon name="chevronRight" size={16} className={dir === "up" ? "-rotate-90" : "rotate-90"} />
                              </button>
                            </form>
                          ))}
                          <form action={removeWorkoutItem}>
                            <input type="hidden" name="workoutId" value={id} />
                            <input type="hidden" name="id" value={item.id} />
                            <button className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label="Remover"><Icon name="x" size={16} /></button>
                          </form>
                        </div>
                      </div>
                      <form action={updateWorkoutItem} className="mt-2 grid grid-cols-4 gap-1.5 text-xs text-zinc-500">
                        <input type="hidden" name="workoutId" value={id} />
                        <input type="hidden" name="id" value={item.id} />
                        <label>Séries<input name="sets" type="number" min={1} defaultValue={item.sets ?? ""} className={small} /></label>
                        <label>Reps<input name="reps" defaultValue={item.reps ?? ""} className={small} /></label>
                        <label>Carga<input name="load" defaultValue={item.load ?? ""} placeholder="kg" className={small} /></label>
                        <label>Descanso (s)<input name="restSeconds" type="number" min={0} defaultValue={item.restSeconds ?? ""} className={small} /></label>
                        <input name="notes" defaultValue={item.notes ?? ""} placeholder="Observação (ex.: cadência 3-1-1)" className={cx(small, "col-span-3")} />
                        <SubmitButton variant="secondary" size="sm" pendingText="…">Salvar</SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Nome e orientações">
            <form action={updateWorkout} className="grid gap-3 p-5">
              <input type="hidden" name="id" value={id} />
              <Field label="Nome"><Input name="name" defaultValue={w.workout.name} /></Field>
              <Field label="Orientações gerais para o aluno"><Textarea name="notes" defaultValue={w.workout.notes ?? ""} placeholder="Aquecimento de 10 min na esteira antes de começar…" /></Field>
              <div><SubmitButton variant="secondary">Salvar</SubmitButton></div>
            </form>
          </Card>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card title="Copiar para outro aluno">
              <form action={duplicateWorkout} className="grid gap-3 p-5">
                <input type="hidden" name="id" value={id} />
                <Select name="studentId" required>{others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
                <SubmitButton variant="secondary" icon="copy" pendingText="Copiando…">Copiar treino</SubmitButton>
              </form>
            </Card>
            <Card title="Excluir treino">
              <form action={deleteWorkout} className="p-5">
                <input type="hidden" name="id" value={id} />
                <DangerConfirm label="Excluir treino" />
              </form>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Card title="Adicionar da biblioteca" className="lg:sticky lg:top-6">
            <div className="space-y-3 p-4">
              <form action={base}>
                <div className="relative">
                  <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input name="q" defaultValue={q} placeholder="Buscar exercício" className="pl-9" />
                </div>
              </form>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g) => (
                  <Link key={g} href={`${base}?grupo=${encodeURIComponent(g)}`} scroll={false} className={cx("rounded-full px-2.5 py-1 text-xs", !q && grupo === g ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200")}>
                    {g}
                  </Link>
                ))}
              </div>
              <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {picker.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-2">
                    <ExerciseImage images={e.images} name={e.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{e.name}</p>
                      <p className="text-xs text-zinc-500">{e.equipment ?? e.muscleGroup}</p>
                    </div>
                    <form action={addWorkoutItem}>
                      <input type="hidden" name="workoutId" value={id} />
                      <input type="hidden" name="exerciseId" value={e.id} />
                      <input type="hidden" name="sets" value={e.muscleGroup === "Cardio" ? "1" : "3"} />
                      <input type="hidden" name="reps" value={e.muscleGroup === "Cardio" ? "20 min" : "12"} />
                      <input type="hidden" name="restSeconds" value="60" />
                      <SubmitButton variant="secondary" size="sm" icon="plus" pendingText="…">Adicionar</SubmitButton>
                    </form>
                  </li>
                ))}
                {picker.length === 0 && <li className="py-6 text-center text-sm text-zinc-500">Nenhum exercício encontrado.</li>}
              </ul>
              <Link href="/painel/exercicios" className="block text-center text-xs text-zinc-500 underline">Criar exercício próprio</Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
