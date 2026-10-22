import { notFound } from "next/navigation";
import { and, asc, eq, isNull, ne, or } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { addWorkoutItem, deleteWorkout, duplicateWorkout, moveWorkoutItem, removeWorkoutItem, updateWorkout } from "@/app/actions/painel";
import { DangerConfirm, SubmitButton } from "@/components/client";
import { Card, EmptyState, Field, Input, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function TreinoEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ copiado?: string }> }) {
  const { id } = await params;
  const { copiado } = await searchParams;
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
      .orderBy(asc(S.exercises.muscleGroup), asc(S.exercises.name)),
    db
      .select({ id: S.students.id, name: S.students.name })
      .from(S.students)
      .where(and(eq(S.students.tenantId, tenant.id), ne(S.students.id, w.student.id)))
      .orderBy(asc(S.students.name)),
  ]);
  const groups = [...new Set(library.map((e) => e.muscleGroup ?? "Outros"))];

  return (
    <>
      <PageHeader back={`/painel/alunos/${w.student.id}?aba=treinos`} title={w.workout.name} subtitle={`Treino de ${w.student.name}`} />
      {copiado && <div className="mb-4"><Notice tone="green">Treino copiado para este aluno. Ajuste cargas e repetições se precisar.</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Exercícios · ${items.length}`}>
            {items.length === 0 ? (
              <EmptyState icon="dumbbell" title="Treino vazio" text="Adicione exercícios no formulário ao lado." />
            ) : (
              <ol className="divide-y divide-zinc-100">
                {items.map(({ item, ex }, idx) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-900">{ex.name}</p>
                      <p className="text-sm text-zinc-500">
                        {[item.sets && `${item.sets} séries`, item.reps && `${item.reps} reps`, item.load, item.restSeconds && `descanso ${item.restSeconds}s`].filter(Boolean).join(" · ")}
                      </p>
                      {item.notes && <p className="text-xs text-zinc-500">{item.notes}</p>}
                    </div>
                    <div className="flex items-center">
                      {(["up", "down"] as const).map((dir) => (
                        <form key={dir} action={moveWorkoutItem}>
                          <input type="hidden" name="workoutId" value={id} />
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="dir" value={dir} />
                          <button className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30" disabled={(dir === "up" && idx === 0) || (dir === "down" && idx === items.length - 1)} aria-label={dir === "up" ? "Subir" : "Descer"}>
                            <Icon name="chevronRight" size={16} className={dir === "up" ? "-rotate-90" : "rotate-90"} />
                          </button>
                        </form>
                      ))}
                      <form action={removeWorkoutItem}>
                        <input type="hidden" name="workoutId" value={id} />
                        <input type="hidden" name="id" value={item.id} />
                        <button className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label="Remover">
                          <Icon name="x" size={16} />
                        </button>
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
        </div>
        <div className="space-y-6">
          <Card title="Adicionar exercício">
            <form action={addWorkoutItem} className="grid grid-cols-2 gap-3 p-5">
              <input type="hidden" name="workoutId" value={id} />
              <Field label="Exercício" className="col-span-2">
                <Select name="exerciseId" required>
                  {groups.map((g) => (
                    <optgroup key={g} label={g}>
                      {library.filter((e) => (e.muscleGroup ?? "Outros") === g).map((e) => (
                        <option key={e.id} value={e.id}>{e.name}{e.tenantId ? " ★" : ""}</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <Field label="Séries"><Input name="sets" type="number" min={1} defaultValue={3} /></Field>
              <Field label="Repetições"><Input name="reps" defaultValue="12" /></Field>
              <Field label="Carga"><Input name="load" placeholder="ex.: 20 kg" /></Field>
              <Field label="Descanso (s)"><Input name="restSeconds" type="number" defaultValue={60} /></Field>
              <Field label="Observação" className="col-span-2"><Input name="notes" placeholder="ex.: cadência 3-1-1" /></Field>
              <div className="col-span-2"><SubmitButton className="w-full" icon="plus" pendingText="Adicionando…">Adicionar</SubmitButton></div>
              <p className="col-span-2 text-xs text-zinc-500">★ = exercício criado por você. Crie novos em Exercícios.</p>
            </form>
          </Card>
          <Card title="Copiar para outro aluno">
            <form action={duplicateWorkout} className="grid gap-3 p-5">
              <input type="hidden" name="id" value={id} />
              <Select name="studentId" required>
                {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
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
    </>
  );
}
