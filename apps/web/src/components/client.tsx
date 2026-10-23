"use client";
// Componentes interativos (precisam rodar no navegador).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { btn, cx, type BtnVariant } from "./ui";

export function SubmitButton({
  children,
  variant = "primary",
  size,
  pendingText = "Salvando…",
  className,
  icon,
  name,
  value,
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md";
  pendingText?: string;
  className?: string;
  icon?: IconName;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={cx(btn(variant, size), className)}>
      {icon && !pending && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {pending ? pendingText : children}
    </button>
  );
}

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

export function SideNav({ items, dark = false }: { items: NavItem[]; dark?: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              dark
                ? active
                  ? "bg-volt text-ink"
                  : "text-zinc-400 hover:bg-ink-2 hover:text-white"
                : active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            <Icon name={i.icon} size={18} />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ items, accent }: { items: NavItem[]; accent?: string }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((i) => {
          const active = i.exact ? path === i.href : path.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-zinc-900" : "text-zinc-400")}
              style={active && accent ? { color: accent } : undefined}
            >
              <Icon name={i.icon} size={22} />
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CopyButton({ text, label = "Copiar", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={cx(btn("secondary", "sm"), className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* navegador sem permissão de área de transferência */
        }
      }}
    >
      <Icon name={done ? "check" : "copy"} size={14} />
      {done ? "Copiado" : label}
    </button>
  );
}

/** Mostra/esconde um formulário (sem diálogos de confirmação do navegador). */
export function Disclosure({ label, children, icon = "plus", variant = "primary", defaultOpen = false }: { label: string; children: ReactNode; icon?: IconName; variant?: BtnVariant; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={btn(variant)}>
          <Icon name={icon} size={16} /> {label}
        </button>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700" aria-label="Fechar">
              <Icon name="x" size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

/** Botão de exclusão em dois cliques (sem confirm() do navegador). */
export function DangerConfirm({ label = "Excluir", confirmLabel = "Confirmar exclusão" }: { label?: string; confirmLabel?: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  if (!armed)
    return (
      <button type="button" onClick={() => setArmed(true)} className={btn("danger", "sm")}>
        <Icon name="trash" size={14} /> {label}
      </button>
    );
  return (
    <span className="inline-flex gap-1">
      <button type="submit" disabled={pending} className={btn("danger", "sm")}>
        {pending ? "Excluindo…" : confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className={btn("ghost", "sm")}>
        Cancelar
      </button>
    </span>
  );
}
