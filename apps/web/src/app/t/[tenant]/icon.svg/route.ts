// Ícone padrão do app do aluno: inicial do negócio sobre a cor da marca.
import { eq } from "drizzle-orm";
import { getDb, schema as S } from "@/db";

const esc = (s: string) => s.replace(/[<>&"']/g, "");

export async function GET(_: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const db = await getDb();
  const [t] = await db.select().from(S.tenants).where(eq(S.tenants.slug, slug));
  const color = t && /^#[0-9a-fA-F]{6}$/.test(t.primaryColor) ? t.primaryColor : "#111827";
  const accent = t && /^#[0-9a-fA-F]{6}$/.test(t.accentColor) ? t.accentColor : "#22C55E";
  const letter = esc((t?.name ?? "P").trim()[0] ?? "P").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${color}"/><circle cx="400" cy="112" r="40" fill="${accent}"/><text x="256" y="330" font-family="Arial, sans-serif" font-size="260" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
