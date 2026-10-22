import { asc, eq, isNull, or } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { createExercise } from "@/app/actions/painel";
import { Disclosure, SubmitButton } from "@/components/client";
import { Badge, Card, Field, Input, Notice, PageHeader, Textarea } from "@/components/ui";

export default async function Exercicios({ searchParams }: { searchParams: Promise<{ salvo?: string; grupo?: string }> }) {
  const { salvo, grupo } = await searchParams;
  const { db, tenant } = await requireOwner();
  const list = await db
    .select()
    .from(S.exercises)
    .where(or(isNull(S.exercises.tenantId), eq(S.exercises.tenantId, tenant.id)))
    .orderBy(asc(S.exercises.muscleGroup), asc(S.exercises.name));
  const groups = [...new Set(list.map((e) => e.muscleGroup ?? "Outros"))];
  const shown = grupo ? list.filter((e) => (e.muscleGroup ?? "Outros") === grupo) : list;

  return (
    <>
      <PageHeader title="Biblioteca de exercícios" subtitle={`${list.length} exercícios · os seus aparecem com a etiqueta “Meu”.`} />
      {salvo && <div className="mb-4"><Notice tone="green">Exercício criado.</Notice></div>}
      <div className="mb-5">
        <Disclosure label="Novo exercício">
          <form action={createExercise} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome"><Input name="name" required /></Field>
            <Field label="Grupo muscular"><Input name="muscleGroup" list="grupos" placeholder="Ex.: Pernas" /></Field>
            <datalist id="grupos">{groups.map((g) => <option key={g} value={g} />)}</datalist>
            <Field label="Link do vídeo (YouTube, Instagram…)" className="sm:col-span-2"><Input name="videoUrl" type="url" placeholder="https://" /></Field>
            <Field label="Instruções de execução" className="sm:col-span-2"><Textarea name="instructions" rows={2} /></Field>
            <div><SubmitButton>Salvar exercício</SubmitButton></div>
          </form>
        </Disclosure>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <a href="/painel/exercicios" className={`rounded-full px-3 py-1 text-sm ${!grupo ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}>Todos</a>
        {groups.map((g) => (
          <a key={g} href={`/painel/exercicios?grupo=${encodeURIComponent(g)}`} className={`rounded-full px-3 py-1 text-sm ${grupo === g ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}>{g}</a>
        ))}
      </div>
      <Card>
        <ul className="grid divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-y-0">
          {shown.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 border-zinc-100 px-5 py-3 sm:border-b">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{e.name}</p>
                <p className="text-xs text-zinc-500">{e.muscleGroup ?? "Outros"}</p>
              </div>
              <div className="flex items-center gap-2">
                {e.videoUrl && <a href={e.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 underline">vídeo</a>}
                {e.tenantId && <Badge tone="violet">Meu</Badge>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
