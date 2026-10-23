import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { schema as S } from "@/db";
import { getStudentSession } from "@/lib/auth";
import { AnamneseForm } from "./form";

export const metadata = { title: "Anamnese" };

export default async function Anamnese({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await getStudentSession(slug);
  if (!ctx) redirect(`/t/${slug}`);
  const [prev] = await ctx.db.select().from(S.anamneses).where(eq(S.anamneses.studentId, ctx.student.id));
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-zinc-500">{prev ? "Atualizar respostas" : "Antes de começar"}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Conte um pouco sobre você, {ctx.student.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-zinc-500">Leva uns 3 minutos. Só você e {ctx.tenant.name} veem estas respostas.</p>
      </div>
      <AnamneseForm slug={slug} defaults={prev?.answers} />
    </div>
  );
}
