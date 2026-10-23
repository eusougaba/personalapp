import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { schema as S, type DB } from "@/db";

/** Aluno precisa responder a anamnese antes de usar o app. */
export async function requireAnamnese(ctx: { db: DB; student: { id: string } }, slug: string) {
  const [a] = await ctx.db.select({ id: S.anamneses.id }).from(S.anamneses).where(eq(S.anamneses.studentId, ctx.student.id));
  if (!a) redirect(`/t/${slug}/anamnese`);
}
