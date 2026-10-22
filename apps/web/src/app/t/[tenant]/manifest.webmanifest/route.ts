// Manifesto do PWA por personal: nome, cores e ícone do app na tela inicial do aluno.
import { eq } from "drizzle-orm";
import { getDb, schema as S } from "@/db";

export async function GET(_: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const db = await getDb();
  const [t] = await db.select().from(S.tenants).where(eq(S.tenants.slug, slug));
  if (!t) return new Response("Not found", { status: 404 });
  const icon = `/t/${slug}/icon.svg`;
  return Response.json(
    {
      name: t.name,
      short_name: t.name.length > 14 ? t.name.split(" ")[0] : t.name,
      start_url: `/t/${slug}`,
      scope: `/t/${slug}`,
      display: "standalone",
      background_color: "#fafafa",
      theme_color: t.primaryColor,
      icons: [
        { src: t.iconUrl ?? icon, sizes: "any", type: t.iconUrl ? "image/png" : "image/svg+xml", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
