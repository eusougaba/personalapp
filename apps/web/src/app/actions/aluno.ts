"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { id } from "@/lib/format";

export async function completeWorkout(form: FormData) {
  const slug = String(form.get("slug"));
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  const workoutId = String(form.get("workoutId"));
  const [w] = await ctx.db
    .select({ id: S.workouts.id })
    .from(S.workouts)
    .where(and(eq(S.workouts.id, workoutId), eq(S.workouts.studentId, ctx.student.id)));
  if (!w) redirect(`/t/${slug}`);
  const effort = Number(form.get("effort"));
  await ctx.db.insert(S.workoutLogs).values({
    id: id(),
    workoutId,
    effort: effort >= 1 && effort <= 10 ? effort : null,
    comment: String(form.get("comment") ?? "").trim() || null,
  });
  redirect(`/t/${slug}?concluido=1`);
}
