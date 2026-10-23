// Componentes de interface reutilizáveis (server-safe).
import Link from "next/link";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Icon, type IconName } from "./icons";
import { fromLocal, initials, todayLocal } from "@/lib/format";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
            <Icon name="chevronLeft" size={16} /> Voltar
          </Link>
        )}
        <h1 className="font-display truncate text-3xl uppercase leading-tight tracking-[0.01em] text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx("rounded-2xl border border-zinc-200 bg-white", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const btnVariants = {
  primary: "bg-ink text-white hover:bg-ink-3",
  volt: "bg-volt text-ink hover:brightness-105",
  accent: "bg-[var(--accent)] text-white hover:brightness-110",
  secondary: "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
  ghost: "text-zinc-600 hover:bg-zinc-100",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-500",
};
export type BtnVariant = keyof typeof btnVariants;

export function btn(variant: BtnVariant = "primary", size: "sm" | "md" = "md") {
  return cx(btnBase, btnVariants[variant], size === "sm" && "px-3 py-1.5 text-xs rounded-lg");
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size,
  icon,
  external,
}: {
  href: string;
  children: ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md";
  icon?: IconName;
  external?: boolean;
}) {
  const cls = btn(variant, size);
  const inner = (
    <>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-auto", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(inputCls, props.className)} />;
}

const badgeTones = {
  gray: "bg-zinc-100 text-zinc-700",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
};
export type Tone = keyof typeof badgeTones;

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", badgeTones[tone])}>{children}</span>;
}

export function Stat({ label, value, hint, tone, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "green" | "default"; icon?: IconName }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between text-sm text-zinc-500">
        {label}
        {icon && <Icon name={icon} size={18} className="text-zinc-400" />}
      </div>
      <div className={cx("font-display mt-2 text-[26px] sm:text-[32px] leading-none tracking-[0.01em]", tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-700" : "text-ink")}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export function Avatar({ name, size = 40, color = "#18181b" }: { name: string; size?: number; color?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({ icon = "users", title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 rounded-2xl bg-zinc-100 p-3 text-zinc-500">
        <Icon name={icon} size={24} />
      </span>
      <p className="font-medium text-zinc-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-zinc-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "yellow", children }: { tone?: "yellow" | "red" | "green" | "blue"; children: ReactNode }) {
  const t = { yellow: "bg-amber-50 text-amber-800 border-amber-200", red: "bg-red-50 text-red-800 border-red-200", green: "bg-emerald-50 text-emerald-800 border-emerald-200", blue: "bg-sky-50 text-sky-800 border-sky-200" }[tone];
  return <div className={cx("rounded-xl border px-4 py-3 text-sm", t)}>{children}</div>;
}

export function Tabs({ tabs, active }: { tabs: { href: string; label: string; key: string; count?: number }[]; active: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-zinc-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cx(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
            t.key === active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
          )}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function invoiceTone(status: string, dueDate: Date): { tone: Tone; label: string } {
  if (status === "PAID") return { tone: "green", label: "Pago" };
  if (status === "CANCELED") return { tone: "gray", label: "Cancelada" };
  if (status === "REFUNDED") return { tone: "violet", label: "Estornada" };
  if (status === "OVERDUE" || dueDate < fromLocal(todayLocal(), "00:00")) return { tone: "red", label: "Atrasada" };
  return { tone: "yellow", label: "Pendente" };
}

export const STUDENT_STATUS: Record<string, { tone: Tone; label: string }> = {
  ACTIVE: { tone: "green", label: "Ativo" },
  INVITED: { tone: "blue", label: "Convidado" },
  PAUSED: { tone: "yellow", label: "Pausado" },
  INACTIVE: { tone: "gray", label: "Inativo" },
};
