"use server";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { checkPassword, endSession, hashPassword, startSession } from "@/lib/auth";
import { addDays, fromLocal, id, todayLocal } from "@/lib/format";

export type FormState = { error?: string } | undefined;

const RESERVED = new Set(["www", "app", "admin", "api", "painel", "entrar", "cadastro", "t"]);

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  business: z.string().trim().min(2, "Informe o nome do seu negócio"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/, "Endereço: 3 a 32 letras minúsculas, números ou hífen"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (RESERVED.has(d.slug)) return { error: "Esse endereço é reservado, escolha outro" };
  const db = await getDb();
  const [emailTaken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, d.email));
  if (emailTaken) return { error: "Já existe uma conta com esse e-mail" };
  const [slugTaken] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, d.slug));
  if (slugTaken) return { error: "Esse endereço já está em uso" };

  const userId = id();
  const tenantId = id();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(schema.users).values({ id: userId, email: d.email, name: d.name, passwordHash: await hashPassword(d.password) });
    await tx.insert(schema.tenants).values({ id: tenantId, slug: d.slug, name: d.business, updatedAt: now });
    await tx.insert(schema.memberships).values({ id: id(), userId, tenantId, role: "OWNER" });
    await tx.insert(schema.platformSubscriptions).values({
      id: id(),
      tenantId,
      tier: "PRO",
      status: "TRIALING",
      priceCents: 9900,
      trialEndsAt: fromLocal(addDays(todayLocal(), 14)),
    });
  });
  await startSession(userId);
  redirect("/painel?bemvindo=1");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha" };
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!u?.passwordHash || !(await checkPassword(password, u.passwordHash))) return { error: "E-mail ou senha incorretos" };
  await startSession(u.id);
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  const [m] = await db
    .select({ role: schema.memberships.role, slug: schema.tenants.slug })
    .from(schema.memberships)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
    .where(eq(schema.memberships.userId, u.id))
    .orderBy(sql`CASE WHEN ${schema.memberships.role} = 'OWNER' THEN 0 ELSE 1 END`);
  redirect(m?.role === "STUDENT" ? `/t/${m.slug}` : "/painel");
}

export async function logout(form: FormData) {
  await endSession();
  const to = String(form.get("to") ?? "/entrar");
  redirect(to.startsWith("/") ? to : "/entrar");
}

/** Aluno aceita o convite: cria (ou vincula) a conta e define a senha. */
export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const consent = form.get("consent") === "on";
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres" };
  if (!consent) return { error: "É preciso aceitar o uso dos seus dados para continuar" };
  const db = await getDb();
  const [row] = await db
    .select({ student: schema.students, slug: schema.tenants.slug })
    .from(schema.students)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.students.tenantId))
    .where(eq(schema.students.inviteToken, token));
  if (!row) return { error: "Convite inválido ou já utilizado" };
  const email = (String(form.get("email") ?? "") || row.student.email || "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Informe um e-mail válido" };

  let [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (u?.passwordHash) return { error: "Já existe uma conta com esse e-mail. Entre com sua senha." };
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    if (u) {
      await tx.update(schema.users).set({ passwordHash: hash, name: u.name ?? row.student.name }).where(eq(schema.users.id, u.id));
    } else {
      const [nu] = await tx.insert(schema.users).values({ id: id(), email, name: row.student.name, phone: row.student.phone, passwordHash: hash }).returning();
      u = nu!;
    }
    const [mem] = await tx
      .select({ id: schema.memberships.id })
      .from(schema.memberships)
      .where(and(eq(schema.memberships.userId, u!.id), eq(schema.memberships.tenantId, row.student.tenantId)));
    if (!mem) await tx.insert(schema.memberships).values({ id: id(), userId: u!.id, tenantId: row.student.tenantId, role: "STUDENT" });
    await tx
      .update(schema.students)
      .set({ userId: u!.id, email, inviteToken: null, status: "ACTIVE", healthDataConsentAt: new Date() })
      .where(eq(schema.students.id, row.student.id));
  });
  await startSession(u!.id);
  redirect(`/t/${row.slug}`);
}
