import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { Sparkline } from "@/components/charts";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Evolução" };

export default async function Evolucao({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  const { db, tenant, student } = ctx;
  const list = await db.select().from(S.assessments).where(eq(S.assessments.studentId, student.id)).orderBy(asc(S.assessments.date));
  const first = list[0];
  const last = list.at(-1);
  const metric = (label: string, key: "weightKg" | "bodyFatPct", unit: string, color: string) => {
    const vals = list.filter((a) => a[key]).map((a) => Number(a[key]));
    if (!vals.length) return null;
    const d = vals.length > 1 ? vals.at(-1)! - vals[0]! : null;
    return (
      <div className="rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="text-3xl font-semibold">{vals.at(-1)!.toFixed(1)}{unit}</p>
        {d != null && <p className="text-sm text-zinc-500">{d > 0 ? "+" : ""}{d.toFixed(1)}{unit} desde {fmtDate(first!.date)}</p>}
        <div className="mt-3"><Sparkline values={vals} color={color} /></div>
      </div>
    );
  };
  const LABEL: Record<string, string> = { cintura: "Cintura", quadril: "Quadril", peito: "Peito", braco: "Braço", coxa: "Coxa", panturrilha: "Panturrilha" };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Minha evolução</h1>
      {list.length === 0 ? (
        <p className="text-sm text-zinc-500">Sua primeira avaliação física ainda não foi registrada.</p>
      ) : (
        <>
          {metric("Peso", "weightKg", " kg", tenant.accentColor)}
          {metric("Gordura corporal", "bodyFatPct", "%", tenant.primaryColor)}
          {last?.measures && Object.keys(last.measures).length > 0 && (
            <div className="rounded-3xl bg-white p-5 ring-1 ring-zinc-200">
              <p className="mb-3 text-sm text-zinc-500">Medidas (cm) · {fmtDate(last.date)}</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(last.measures).map(([k, v]) => {
                  const before = first?.measures?.[k];
                  const d = before != null && first !== last ? Number(v) - Number(before) : null;
                  return (
                    <div key={k} className="rounded-2xl bg-zinc-50 p-3">
                      <p className="text-xs text-zinc-500">{LABEL[k] ?? k}</p>
                      <p className="text-lg font-semibold">{Number(v).toFixed(1)}</p>
                      {d != null && <p className="text-xs text-zinc-500">{d > 0 ? "+" : ""}{d.toFixed(1)} cm</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
