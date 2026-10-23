"use client";
// Execução do treino pelo aluno: carga e repetições por série, cronômetro de descanso,
// referência da última vez e progresso salvo no aparelho (caso a página recarregue).
import { useEffect, useMemo, useRef, useState } from "react";
import { completeWorkout } from "@/app/actions/aluno";
import { SubmitButton } from "@/components/client";
import { ExerciseImage } from "@/components/exercise-image";
import { Icon } from "@/components/icons";

export type RunnerItem = {
  itemId: string;
  exerciseId: string;
  name: string;
  images: string[];
  sets: number;
  reps: string | null;
  load: string | null;
  restSeconds: number;
  notes: string | null;
  instructions: string | null;
  cardio: boolean;
  last: { setNumber: number; reps: number | null; loadKg: number | null }[];
};

type SetRow = { kg: string; reps: string; done: boolean };
type State = { startedAt: number; rows: Record<string, SetRow[]> };

const firstNumber = (s: string | null | undefined) => {
  const m = String(s ?? "").replace(",", ".").match(/\d+(\.\d+)?/);
  return m ? m[0] : "";
};
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;

function initial(items: RunnerItem[]): State {
  const rows: Record<string, SetRow[]> = {};
  for (const it of items) {
    const n = Math.max(1, it.last.length && !it.cardio ? Math.max(it.sets, 1) : it.sets);
    rows[it.itemId] = Array.from({ length: n }, (_, i) => {
      const prev = it.last.find((l) => l.setNumber === i + 1) ?? it.last.at(-1);
      return {
        kg: prev?.loadKg != null ? String(prev.loadKg).replace(".", ",") : firstNumber(it.load).replace(".", ","),
        reps: prev?.reps != null ? String(prev.reps) : it.cardio ? "" : firstNumber(it.reps),
        done: false,
      };
    });
  }
  return { startedAt: Date.now(), rows };
}

function lastSummary(last: RunnerItem["last"]) {
  const one = (l: RunnerItem["last"][number]) => `${l.loadKg != null ? `${String(l.loadKg).replace(".", ",")} kg` : "—"} × ${l.reps ?? "—"}`;
  const same = last.every((l) => l.loadKg === last[0]!.loadKg && l.reps === last[0]!.reps);
  return same ? `${last.length} × (${one(last[0]!)})` : last.map(one).join(" · ");
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  } catch {
    /* sem áudio */
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* sem vibração */
  }
}

export function WorkoutRunner({ slug, workoutId, items }: { slug: string; workoutId: string; items: RunnerItem[] }) {
  const key = `treino:${workoutId}`;
  const [state, setState] = useState<State>(() => initial(items));
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [rest, setRest] = useState<{ until: number; total: number; label: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const beeped = useRef(false);

  // Recupera progresso salvo neste aparelho (se houver, de até 6 horas atrás)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null") as State | null;
      if (saved && Date.now() - saved.startedAt < 6 * 3600_000 && items.every((i) => saved.rows[i.itemId])) setState(saved);
    } catch {
      /* armazenamento indisponível */
    }
    setLoaded(true);
  }, [key, items]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* armazenamento indisponível */
    }
  }, [key, state, loaded]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const restLeft = rest ? Math.ceil((rest.until - now) / 1000) : 0;
  useEffect(() => {
    if (rest && restLeft <= 0 && !beeped.current) {
      beeped.current = true;
      beep();
      const t = setTimeout(() => setRest(null), 2500);
      return () => clearTimeout(t);
    }
  }, [rest, restLeft]);

  const update = (itemId: string, idx: number, patch: Partial<SetRow>) =>
    setState((s) => ({ ...s, rows: { ...s.rows, [itemId]: s.rows[itemId]!.map((r, i) => (i === idx ? { ...r, ...patch } : r)) } }));

  const toggleDone = (it: RunnerItem, idx: number) => {
    const row = state.rows[it.itemId]![idx]!;
    const done = !row.done;
    update(it.itemId, idx, { done });
    if (done && it.restSeconds > 0) {
      beeped.current = false;
      setRest({ until: Date.now() + it.restSeconds * 1000, total: it.restSeconds, label: it.name });
    }
  };

  const addSet = (itemId: string) =>
    setState((s) => {
      const rows = s.rows[itemId]!;
      const lastRow = rows.at(-1) ?? { kg: "", reps: "", done: false };
      return { ...s, rows: { ...s.rows, [itemId]: [...rows, { ...lastRow, done: false }] } };
    });
  const removeSet = (itemId: string) =>
    setState((s) => ({ ...s, rows: { ...s.rows, [itemId]: s.rows[itemId]!.length > 1 ? s.rows[itemId]!.slice(0, -1) : s.rows[itemId]! } }));

  const totalSets = useMemo(() => Object.values(state.rows).reduce((a, r) => a + r.length, 0), [state]);
  const doneSets = useMemo(() => Object.values(state.rows).reduce((a, r) => a + r.filter((x) => x.done).length, 0), [state]);
  const elapsed = Math.floor((now - state.startedAt) / 1000);
  const payload = JSON.stringify(
    items.flatMap((it) =>
      state.rows[it.itemId]!.map((r, i) => ({ ...r, i }))
        .filter((r) => r.done)
        .map((r) => ({ exerciseId: it.exerciseId, setNumber: r.i + 1, reps: r.reps, loadKg: r.kg })),
    ),
  );
  const current = items.find((it) => state.rows[it.itemId]!.some((r) => !r.done))?.itemId;

  const input = "w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-base font-medium tabular-nums focus:border-zinc-400 focus:outline-none";

  return (
    <div className="space-y-3">
      <div className="sticky top-[60px] z-10 -mx-4 flex items-center gap-3 bg-zinc-50/95 px-4 py-2 backdrop-blur">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full transition-all" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`, background: "var(--accent)" }} />
        </div>
        <span className="text-xs tabular-nums text-zinc-500">{doneSets}/{totalSets} séries</span>
        <span className="flex items-center gap-1 text-xs tabular-nums text-zinc-500"><Icon name="clock" size={13} />{fmt(elapsed)}</span>
      </div>

      {items.map((it, n) => {
        const rows = state.rows[it.itemId]!;
        const complete = rows.every((r) => r.done);
        const isCurrent = it.itemId === current;
        const showHow = open === it.itemId;
        return (
          <section key={it.itemId} className={`overflow-hidden rounded-3xl bg-white ring-1 transition ${isCurrent ? "ring-2 ring-[var(--accent)]" : complete ? "ring-emerald-200" : "ring-zinc-200"}`}>
            <div className="flex gap-3 p-4">
              <button type="button" onClick={() => setOpen(showHow ? null : it.itemId)} className="shrink-0" aria-label="Ver como fazer">
                <ExerciseImage images={it.images} name={it.name} size="sm" className="h-20 w-20" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-400">Exercício {n + 1} de {items.length}</p>
                <p className={`font-semibold ${complete ? "text-zinc-400 line-through" : "text-zinc-900"}`}>{it.name}</p>
                <p className="text-sm text-zinc-500">
                  {[`${it.sets} × ${it.reps ?? "—"}`, it.load, it.restSeconds ? `descanso ${it.restSeconds}s` : null].filter(Boolean).join(" · ")}
                </p>
                {it.last.length > 0 && (
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Última vez: {lastSummary(it.last)}
                  </p>
                )}
                <button type="button" onClick={() => setOpen(showHow ? null : it.itemId)} className="mt-1 text-xs font-medium text-zinc-500 underline">
                  {showHow ? "Fechar" : "Como fazer"}
                </button>
              </div>
            </div>
            {showHow && (
              <div className="space-y-2 px-4 pb-3">
                <ExerciseImage images={it.images} name={it.name} size="lg" />
                {it.instructions && <p className="text-sm text-zinc-600">{it.instructions}</p>}
              </div>
            )}
            {it.notes && <p className="mx-4 mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{it.notes}</p>}
            <div className="border-t border-zinc-100 px-4 py-3">
              <div className="mb-1.5 grid grid-cols-[2rem_1fr_1fr_3rem] gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                <span>Série</span>
                <span className="text-center">{it.cardio ? "Min" : "Kg"}</span>
                <span className="text-center">{it.cardio ? "Km" : "Reps"}</span>
                <span />
              </div>
              <div className="space-y-1.5">
                {rows.map((r, i) => (
                  <div key={i} className={`grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-xl ${r.done ? "bg-emerald-50" : ""}`}>
                    <span className="text-center text-sm font-semibold text-zinc-500">{i + 1}</span>
                    <input inputMode="decimal" value={r.kg} onChange={(e) => update(it.itemId, i, { kg: e.target.value })} className={input} aria-label={`Carga série ${i + 1}`} />
                    <input inputMode="numeric" value={r.reps} onChange={(e) => update(it.itemId, i, { reps: e.target.value })} className={input} aria-label={`Repetições série ${i + 1}`} />
                    <button
                      type="button"
                      onClick={() => toggleDone(it, i)}
                      className={`grid h-10 w-12 place-items-center rounded-xl text-white transition ${r.done ? "" : "bg-zinc-200 text-zinc-500"}`}
                      style={r.done ? { background: "var(--accent)" } : undefined}
                      aria-label={r.done ? "Desmarcar série" : "Concluir série"}
                    >
                      <Icon name="check" size={20} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-3 text-xs font-medium text-zinc-500">
                <button type="button" onClick={() => addSet(it.itemId)}>+ Série</button>
                {rows.length > 1 && <button type="button" onClick={() => removeSet(it.itemId)}>− Série</button>}
              </div>
            </div>
          </section>
        );
      })}

      <form
        action={completeWorkout}
        onSubmit={() => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* armazenamento indisponível */
          }
        }}
        className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-zinc-200"
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="sets" value={payload} />
        <input type="hidden" name="durationSec" value={elapsed} />
        <p className="font-semibold">Terminou? Registre o treino</p>
        <p className="text-sm text-zinc-500">{doneSets} de {totalSets} séries concluídas · {fmt(elapsed)} de treino</p>
        <label className="block text-sm text-zinc-600">
          Como foi o esforço? (1 leve – 10 máximo)
          <input type="range" name="effort" min={1} max={10} defaultValue={7} className="mt-2 w-full accent-[var(--accent)]" />
        </label>
        <textarea name="comment" rows={2} placeholder="Algum comentário para o personal? (opcional)" className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm" />
        <SubmitButton variant="accent" className="w-full" pendingText="Registrando…">Concluir treino</SubmitButton>
      </form>

      {rest && (
        <div className="fixed inset-x-0 bottom-[68px] z-40 px-4 lg:bottom-4">
          <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-zinc-900 p-3 text-white shadow-xl">
            <div className="relative grid h-14 w-14 shrink-0 place-items-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray={`${(Math.max(0, restLeft) / rest.total) * 100.5} 100.5`} strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold tabular-nums">{restLeft > 0 ? fmt(restLeft) : "0:00"}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{restLeft > 0 ? "Descanso" : "Bora, próxima série!"}</p>
              <p className="truncate text-xs text-white/60">{rest.label}</p>
            </div>
            <button type="button" onClick={() => setRest((r) => (r ? { ...r, until: r.until + 15000, total: r.total + 15 } : r))} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium">+15s</button>
            <button type="button" onClick={() => setRest(null)} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium">Pular</button>
          </div>
        </div>
      )}
    </div>
  );
}
