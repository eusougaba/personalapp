import { themeToCssVars, type TenantTheme } from "@/lib/tenant";

// TODO(MVP): buscar a marca do tenant no banco (Prisma) pelo slug.
async function getTenantTheme(slug: string): Promise<TenantTheme> {
  const demo: Record<string, TenantTheme> = {
    felipe: { name: "Felipe Astur Personal", primaryColor: "#0F172A", accentColor: "#F97316" },
  };
  return demo[slug] ?? { name: slug, primaryColor: "#111827", accentColor: "#22C55E" };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const theme = await getTenantTheme(tenant);
  return (
    <div style={themeToCssVars(theme) as React.CSSProperties} className="min-h-screen">
      <header className="bg-brand px-4 py-3 text-white">
        <span className="font-semibold">{theme.name}</span>
      </header>
      {children}
    </div>
  );
}
