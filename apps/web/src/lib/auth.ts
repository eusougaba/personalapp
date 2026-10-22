// Sessão por cookie assinado (JWT) + senha com bcrypt.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const COOKIE = "pa_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secret() {
  // Sem banco externo (modo local/demonstração) usa um segredo fixo; com Supabase, AUTH_SECRET é obrigatório.
  const s = process.env.AUTH_SECRET || (!process.env.DATABASE_URL ? "dev-secret-somente-local" : "");
  if (!s) throw new Error("Defina AUTH_SECRET nas variáveis de ambiente");
  return new TextEncoder().encode(s);
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function startSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function currentUser() {
  const uid = await currentUserId();
  if (!uid) return null;
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, uid));
  return u ?? null;
}

/** Personal logado + seu tenant. Redireciona para o login se não houver. */
export async function requireOwner() {
  const user = await currentUser();
  if (!user) redirect("/entrar");
  const db = await getDb();
  const [row] = await db
    .select({ tenant: schema.tenants, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
    .where(and(eq(schema.memberships.userId, user.id), eq(schema.memberships.role, "OWNER")));
  if (!row) {
    // É aluno: manda para o app do aluno
    const [m] = await db
      .select({ slug: schema.tenants.slug })
      .from(schema.memberships)
      .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
      .where(eq(schema.memberships.userId, user.id));
    redirect(m ? `/t/${m.slug}` : "/entrar");
  }
  return { user, tenant: row.tenant, db };
}

/** Aluno logado no tenant indicado; null se não estiver logado como aluno dele. */
export async function getStudentSession(tenantSlug: string) {
  const user = await currentUser();
  if (!user) return null;
  const db = await getDb();
  const [row] = await db
    .select({ tenant: schema.tenants, student: schema.students })
    .from(schema.students)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.students.tenantId))
    .where(and(eq(schema.students.userId, user.id), eq(schema.tenants.slug, tenantSlug)));
  if (!row) return null;
  return { user, tenant: row.tenant, student: row.student, db };
}
