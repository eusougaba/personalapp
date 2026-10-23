import Link from "next/link";
import { asc, eq, isNull, or } from "drizzle-orm";
import { schema as S } from "@/db";
import { requireOwner } from "@/lib/auth";
import { createExercise } from "@/app/actions/painel";
import { Disclosure, SubmitButton } from "@/components/client";
import { ExerciseImage } from "@/components/exercise-image";
import { Icon } from "@/components/icons";
import { EQUIPMENT, MUSCLE_GROUPS } from "@/lib/exercises";
import { Badge, Card, EmptyState, Field, Input, Notice, PageHeader, Select, Textarea, cx } from "@/components/ui";

function chip(active: boolean) {
  return cx(
    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition",
    active ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50",
  );
}

export default async function Exercicios({ searchParams }: { searchParams: Promise<{ salvo?: string; grupo?: string; equip?: string; q?: string }> }) {
  const { salvo, grupo, equip, q = "" } = await searchParams;
  const { db, tenant } = await requireOwner();
  const list = await db
    .select()
    .from(S.exercises)
    .where(or(isNull(S.exercises.tenantId), eq(S.exercises.tenantId, tenant.id)))
    .orderBy(asc(S.exercises.name));
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const shown = list.filter(
    (e) =>
      (!grupo || (e.muscleGroup ?? "Outros") === grupo) &&
      (!equip || (e.equipment ?? "Outros") === equip) &&
      (!q || norm(e.name).includes(norm(q))),
  );
  const url = (p: { grupo?: string; equip?: string }) => {
    const sp = new URLSearchParams();
    const g = "grupo" in p ? p.grupo : grupo;
    const e = "equip" in p ? p.equip : equip;
    if (g) sp.set("grupo", g);
    if (e) sp.set("equip", e);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return `/painel/exercicios${s ? `?${s}` : ""}`;
  };
  const counts = (g: string) => list.filter((e) => (e.muscleGroup ?? "Outros") === g).length;

  return (
    <>
      <PageHeader title="Biblioteca de exercícios" subtitle={`${list.length} exercícios com imagem de execução · os seus aparecem como “Meu”.`} />
      {salvo && <div className="mb-4"><Notice tone="green">Exercício criado.</Notice></div>}
      <div className="mb-5">
        <Disclosure label="Novo exercício">
          <form action={createExercise} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome"><Input name="name" required /></Field>
            <Field label="Grupo muscular">
              <Select name="muscleGroup" defaultValue={grupo ?? "Peito"}>{MUSCLE_GROUPS.map((g) => <option key={g}>{g}</option>)}</Select>
            </Field>
            <Field label="Equipamento">
              <Select name="equipment" defaultValue="Halter">{EQUIPMENT.map((g) => <option key={g}>{g}</option>)}</Select>
            </Field>
            <Field label="Imagem (link https, opcional)"><Input name="imageUrl" type="url" placeholder="https://…/exercicio.jpg" /></Field>
            <Field label="Como executar" className="sm:col-span-2"><Textarea name="instructions" rows={2} /></Field>
            <div><SubmitButton>Salvar exercício</SubmitButton></div>
          </form>
        </Disclosure>
      </div>

      <form action="/painel/exercicios" className="mb-3">
        {grupo && <input type="hidden" name="grupo" value={grupo} />}
        {equip && <input type="hidden" name="equip" value={equip} />}
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input name="q" defaultValue={q} placeholder="Buscar exercício" className="pl-9" />
        </div>
      </form>
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        <Link href={url({ grupo: undefined })} className={chip(!grupo)}>Todos os músculos</Link>
        {MUSCLE_GROUPS.filter((g) => counts(g)).map((g) => (
          <Link key={g} href={url({ grupo: g })} className={chip(grupo === g)}>{g} <span className="opacity-60">{counts(g)}</span></Link>
        ))}
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <Link href={url({ equip: undefined })} className={chip(!equip)}>Todos os equipamentos</Link>
        {EQUIPMENT.map((g) => <Link key={g} href={url({ equip: g })} className={chip(equip === g)}>{g}</Link>)}
      </div>

      {shown.length === 0 ? (
        <Card><EmptyState icon="dumbbell" title="Nenhum exercício encontrado" text="Tente outro filtro ou crie o seu exercício." /></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((e) => (
            <details key={e.id} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <summary className="cursor-pointer list-none">
                <ExerciseImage images={e.images} name={e.name} className="rounded-none ring-0" />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium text-zinc-900">{e.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge>{e.muscleGroup ?? "Outros"}</Badge>
                    {e.equipment && <Badge tone="blue">{e.equipment}</Badge>}
                    {e.tenantId && <Badge tone="violet">Meu</Badge>}
                  </div>
                </div>
              </summary>
              {e.instructions && <p className="border-t border-zinc-100 px-3 py-2.5 text-xs text-zinc-600">{e.instructions}</p>}
            </details>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-zinc-400">Imagens: free-exercise-db (domínio público).</p>
    </>
  );
}
