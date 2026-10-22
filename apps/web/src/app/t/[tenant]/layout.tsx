import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { BottomNav } from "@/components/client";
import { logout } from "@/app/actions/auth";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function loadTenant(slug: string) {
  const db = await getDb();
  const [t] = await db.select().from(S.tenants).where(eq(S.tenants.slug, slug));
  return t ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const t = await loadTenant(tenant);
  if (!t) return {};
  return {
    title: { default: t.name, template: `%s · ${t.name}` },
    description: t.bio ?? `App de treinos de ${t.name}`,
    manifest: `/t/${t.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: t.name, statusBarStyle: "default" },
  };
}

export async function generateViewport({ params }: { params: Promise<{ tenant: string }> }): Promise<Viewport> {
  const { tenant } = await params;
  const t = await loadTenant(tenant);
  return { themeColor: t?.primaryColor ?? "#111827", width: "device-width", initialScale: 1 };
}

export default async function TenantLayout({ children, params }: { children: React.ReactNode; params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await loadTenant(slug);
  if (!tenant) notFound();
  const session = await getStudentSession(slug);
  const base = `/t/${slug}`;

  return (
    <div className="min-h-screen bg-zinc-50" style={{ ["--accent" as string]: tenant.accentColor, ["--brand" as string]: tenant.primaryColor }}>
      <header className="sticky top-0 z-20 text-white" style={{ background: tenant.primaryColor }}>
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <a href={base} className="flex items-center gap-2.5">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded-lg bg-white object-contain" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-sm font-bold">{tenant.name[0]}</span>
            )}
            <span className="font-semibold">{tenant.name}</span>
          </a>
          {session && (
            <form action={logout}>
              <input type="hidden" name="to" value={base} />
              <button className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Sair">
                <Icon name="logout" size={18} />
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-28 pt-5">{children}</main>
      {session && (
        <BottomNav
          accent={tenant.accentColor}
          items={[
            { href: base, label: "Início", icon: "home", exact: true },
            { href: `${base}/treinos`, label: "Treinos", icon: "dumbbell" },
            { href: `${base}/agenda`, label: "Agenda", icon: "calendar" },
            { href: `${base}/pagamentos`, label: "Pagamentos", icon: "wallet" },
            { href: `${base}/evolucao`, label: "Evolução", icon: "activity" },
          ]}
        />
      )}
    </div>
  );
}
