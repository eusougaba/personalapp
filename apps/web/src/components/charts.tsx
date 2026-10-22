// Gráficos simples em SVG (sem biblioteca).
import { brl } from "@/lib/format";

export function RevenueChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const H = 160;
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Receitas</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-zinc-300" />Despesas</span>
      </div>
      <div className="grid items-end gap-3" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)`, height: H + 40 }}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-col items-center justify-end gap-1.5">
            <div className="text-[11px] font-medium text-zinc-700">{d.income ? brl(d.income - d.expense).replace(",00", "") : ""}</div>
            <div className="flex w-full items-end justify-center gap-1" style={{ height: H }}>
              <div title={`Receitas ${brl(d.income)}`} className="w-1/3 max-w-6 rounded-t-md bg-emerald-500" style={{ height: `${(d.income / max) * 100}%` }} />
              <div title={`Despesas ${brl(d.expense)}`} className="w-1/3 max-w-6 rounded-t-md bg-zinc-300" style={{ height: `${(d.expense / max) * 100}%` }} />
            </div>
            <div className="text-xs first-letter:uppercase text-zinc-500">{d.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-400">Valor acima de cada mês = saldo (receitas − despesas).</p>
    </div>
  );
}

export function Sparkline({ values, color = "#059669", height = 48 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return null;
  const W = 240;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (W - 8) + 4, height - 4 - ((v - min) / span) * (height - 8)] as const);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }} aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5} fill={color} />
      ))}
    </svg>
  );
}
