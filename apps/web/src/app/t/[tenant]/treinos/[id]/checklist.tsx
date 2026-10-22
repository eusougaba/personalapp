"use client";
import { useState } from "react";

type Item = { id: string; name: string; detail: string; notes: string | null; videoUrl: string | null };

export function ExerciseChecklist({ items }: { items: Item[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setDone((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full transition-all" style={{ width: `${items.length ? (done.size / items.length) * 100 : 0}%`, background: "var(--accent)" }} />
      </div>
      <p className="text-xs text-zinc-500">{done.size} de {items.length} exercícios</p>
      {items.map((it, i) => {
        const on = done.has(it.id);
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => toggle(it.id)}
            className={`flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 transition ${on ? "ring-emerald-300" : "ring-zinc-200"}`}
          >
            <span
              className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${on ? "text-white" : "bg-zinc-100 text-zinc-600"}`}
              style={on ? { background: "var(--accent)" } : undefined}
            >
              {on ? "✓" : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block font-medium ${on ? "text-zinc-400 line-through" : "text-zinc-900"}`}>{it.name}</span>
              {it.detail && <span className="block text-sm text-zinc-500">{it.detail}</span>}
              {it.notes && <span className="mt-1 block text-xs text-zinc-500">{it.notes}</span>}
              {it.videoUrl && (
                <a href={it.videoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-1 inline-block text-xs font-medium underline">
                  Ver execução
                </a>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
