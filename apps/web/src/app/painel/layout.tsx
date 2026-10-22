import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth";
import { schema } from "@/db";
import { BottomNav, SideNav, type NavItem } from "@/components/client";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { logout } from "@/app/actions/auth";
import { fromLocal, todayLocal } from "@/lib/format";

export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { href: "/painel", label: "Início", icon: "home", exact: true },
  { href: "/painel/alunos", label: "Alunos", icon: "users" },
  { href: "/painel/agenda", label: "Agenda", icon: "calendar" },
  { href: "/painel/financeiro", label: "Financeiro", icon: "wallet" },
  { href: "/painel/planos", label: "Planos", icon: "tag" },
  { href: "/painel/exercicios", label: "Exercícios", icon: "dumbbell" },
  { href: "/painel/configuracoes", label: "Minha marca", icon: "settings" },
];

const MOBILE_NAV: NavItem[] = [
  { href: "/painel", label: "Início", icon: "home", exact: true },
  { href: "/painel/alunos", label: "Alunos", icon: "users" },
  { href: "/painel/agenda", label: "Agenda", icon: "calendar" },
  { href: "/painel/financeiro", label: "Financeiro", icon: "wallet" },
  { href: "/painel/mais", label: "Mais", icon: "menu" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant, db } = await requireOwner();
  const [sub] = await db.select().from(schema.platformSubscriptions).where(eq(schema.platformSubscriptions.tenantId, tenant.id));
  const trialDays =
    sub?.status === "TRIALING" && sub.trialEndsAt
      ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - fromLocal(todayLocal()).getTime()) / 86_400_000))
      : null;

  return (
    <div className="min-h-screen bg-zinc-50" style={{ ["--accent" as string]: "#059669" }}>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-200 bg-white px-4 py-5 lg:flex">
        <Link href="/painel" className="mb-6 px-2">
          <Logo />
        </Link>
        <SideNav items={NAV} />
        <div className="mt-auto space-y-3">
          {trialDays != null && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <strong className="block text-sm">Teste grátis</strong>
              {trialDays} {trialDays === 1 ? "dia restante" : "dias restantes"} no plano Pro
            </div>
          )}
          <Link
            href={`/t/${tenant.slug}`}
            target="_blank"
            className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Icon name="link" size={16} /> Ver app do aluno
          </Link>
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={user.name ?? user.email} size={34} color={tenant.primaryColor} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
              <p className="truncate text-xs text-zinc-500">{tenant.name}</p>
            </div>
            <form action={logout}>
              <button className="text-zinc-400 hover:text-zinc-800" aria-label="Sair" title="Sair">
                <Icon name="logout" size={18} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/painel">
          <Logo />
        </Link>
        <Avatar name={user.name ?? user.email} size={32} color={tenant.primaryColor} />
      </header>

      <main className="px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <BottomNav items={MOBILE_NAV} />
    </div>
  );
}
