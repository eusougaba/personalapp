"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { parseAnamnese } from "@/lib/anamnese";
import { id } from "@/lib/format";

type SetIn = { exerciseId: string; setNumber: number; reps: number | null; loadKg: number | null };

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

  const allowed = new Set(
    (await ctx.db.select({ e: S.workoutItems.exerciseId }).from(S.workoutItems).where(eq(S.workoutItems.workoutId, workoutId))).map((r) => r.e),
  );
  let sets: SetIn[] = [];
  try {
    const raw = JSON.parse(String(form.get("sets") ?? "[]"));
    if (Array.isArray(raw)) {
      sets = raw
        .filter((s) => s && allowed.has(String(s.exerciseId)))
        .slice(0, 200)
        .map((s) => {
          const reps = Number(s.reps);
          const load = Number(String(s.loadKg ?? "").replace(",", "."));
          return {
            exerciseId: String(s.exerciseId),
            setNumber: Math.max(1, Math.min(50, Number(s.setNumber) || 1)),
            reps: Number.isFinite(reps) && reps > 0 && reps < 1000 ? Math.round(reps) : null,
            loadKg: Number.isFinite(load) && load > 0 && load < 1000 ? Math.round(load * 100) / 100 : null,
          };
        });
    }
  } catch {
    sets = [];
  }

  const effort = Number(form.get("effort"));
  const duration = Number(form.get("durationSec"));
  const logId = id();
  await ctx.db.transaction(async (tx) => {
    await tx.insert(S.workoutLogs).values({
      id: logId,
      workoutId,
      effort: effort >= 1 && effort <= 10 ? effort : null,
      comment: String(form.get("comment") ?? "").trim().slice(0, 1000) || null,
      durationSec: Number.isFinite(duration) && duration > 0 && duration < 6 * 3600 ? Math.round(duration) : null,
    });
    if (sets.length) {
      await tx.insert(S.workoutSetLogs).values(
        sets.map((s) => ({
          id: id(),
          tenantId: ctx.tenant.id,
          studentId: ctx.student.id,
          workoutLogId: logId,
          exerciseId: s.exerciseId,
          setNumber: s.setNumber,
          reps: s.reps,
          loadKg: s.loadKg == null ? null : s.loadKg.toFixed(2),
        })),
      );
    }
  });
  redirect(`/t/${slug}?concluido=1`);
}

export type AnamneseState = { error?: string; missing?: string[] } | undefined;

export async function submitAnamnese(_: AnamneseState, form: FormData): Promise<AnamneseState> {
  const slug = String(form.get("slug"));
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  if (form.get("declaro") !== "on") return { error: "Confirme que as informações são verdadeiras para continuar." };
  const { answers, missing, hasRisk } = parseAnamnese(form);
  if (missing.length) return { error: "Faltam algumas respostas.", missing };
  await ctx.db.delete(S.anamneses).where(eq(S.anamneses.studentId, ctx.student.id));
  await ctx.db.insert(S.anamneses).values({ id: id(), tenantId: ctx.tenant.id, studentId: ctx.student.id, answers, hasRisk });
  redirect(`/t/${slug}?bemvindo=1`);
}
