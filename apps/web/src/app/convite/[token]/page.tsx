import { eq } from "drizzle-orm";
import { getDb, schema as S } from "@/db";
import { InviteForm } from "@/app/(auth)/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ativar acesso" };

export default async function Convite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  const [row] = await db
    .select({ student: S.students, tenant: S.tenants })
    .from(S.students)
    .innerJoin(S.tenants, eq(S.tenants.id, S.students.tenantId))
    .where(eq(S.students.inviteToken, token));

  if (!row) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-50 p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Convite inválido</h1>
          <p className="mt-1 text-sm text-zinc-500">Esse link já foi usado ou expirou. Peça um novo link ao seu personal.</p>
        </div>
      </main>
    );
  }
  const { student, tenant } = row;
  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="px-6 pb-16 pt-10 text-white" style={{ background: tenant.primaryColor }}>
        <div className="mx-auto max-w-md">
          <p className="text-sm text-white/70">{tenant.name} te convidou</p>
          <h1 className="mt-1 text-2xl font-semibold">Olá, {student.name.split(" ")[0]}! Ative seu app de treinos</h1>
        </div>
      </div>
      <div className="mx-auto -mt-10 max-w-md px-4 pb-10">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <InviteForm token={token} email={student.email} accent={tenant.accentColor} />
        </div>
      </div>
    </main>
  );
}
