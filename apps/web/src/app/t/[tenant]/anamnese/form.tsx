"use client";
import { useActionState, useState } from "react";
import { submitAnamnese } from "@/app/actions/aluno";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";
import { ANAMNESE } from "@/lib/anamnese";

const box = "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-zinc-400 focus:outline-none";

export function AnamneseForm({ slug, defaults }: { slug: string; defaults?: Record<string, unknown> }) {
  const [state, action] = useActionState(submitAnamnese, undefined);
  const [yes, setYes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.entries(defaults ?? {}).filter(([, v]) => v === true)) as Record<string, boolean>,
  );
  const missing = new Set(state?.missing ?? []);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      {ANAMNESE.map((sec, si) => (
        <section key={sec.title} className="rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Parte {si + 1} de {ANAMNESE.length}</p>
          <h2 className="text-lg font-semibold">{sec.title}</h2>
          {sec.text && <p className="mt-1 text-sm text-zinc-500">{sec.text}</p>}
          <div className="mt-4 space-y-5">
            {sec.questions.map((q) => {
              const err = missing.has(q.label);
              return (
                <fieldset key={q.id} className={err ? "rounded-xl ring-2 ring-red-200 ring-offset-4" : ""}>
                  <legend className="mb-2 text-sm font-medium text-zinc-800">{q.label}</legend>
                  {q.type === "yesno" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {(["sim", "nao"] as const).map((v) => (
                          <label key={v} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2.5 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
                            <input
                              type="radio"
                              name={q.id}
                              value={v}
                              className="sr-only"
                              defaultChecked={defaults ? (defaults[q.id] === true) === (v === "sim") : undefined}
                              onChange={() => setYes((y) => ({ ...y, [q.id]: v === "sim" }))}
                            />
                            {v === "sim" ? "Sim" : "Não"}
                          </label>
                        ))}
                      </div>
                      {yes[q.id] && (
                        <textarea name={`${q.id}_detalhe`} rows={2} placeholder={q.detail ?? "Conte um pouco mais"} defaultValue={String(defaults?.[`${q.id}_detalhe`] ?? "")} className={`${box} mt-2`} />
                      )}
                    </>
                  )}
                  {q.type === "select" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((o) => (
                        <label key={o} className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50">
                          <input type="radio" name={q.id} value={o} defaultChecked={defaults?.[q.id] === o} />
                          {o}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === "multi" && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => (
                        <label key={o} className="cursor-pointer rounded-full border border-zinc-200 px-3 py-1.5 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
                          <input type="checkbox" name={q.id} value={o} className="sr-only" defaultChecked={Array.isArray(defaults?.[q.id]) && (defaults![q.id] as string[]).includes(o)} />
                          {o}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === "text" && <input name={q.id} placeholder={q.placeholder} defaultValue={String(defaults?.[q.id] ?? "")} className={box} />}
                  {q.type === "textarea" && <textarea name={q.id} rows={3} placeholder={q.placeholder} defaultValue={String(defaults?.[q.id] ?? "")} className={box} />}
                </fieldset>
              );
            })}
          </div>
        </section>
      ))}
      <label className="flex items-start gap-2 rounded-2xl bg-white p-4 text-sm text-zinc-600 ring-1 ring-zinc-200">
        <input type="checkbox" name="declaro" className="mt-1" />
        <span>Declaro que as informações são verdadeiras e que vou avisar meu personal se minha saúde mudar.</span>
      </label>
      {state?.error && (
        <Notice tone="red">
          {state.error}
          {state.missing?.length ? ` Veja as perguntas destacadas (${state.missing.length}).` : ""}
        </Notice>
      )}
      <SubmitButton variant="accent" className="w-full" pendingText="Enviando…">Enviar e começar</SubmitButton>
    </form>
  );
}
