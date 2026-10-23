import Link from "next/link";
import { LoginForm } from "../forms";
import { DEMO_OWNER } from "@/db/seed";

export const metadata = { title: "Entrar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const isDemo = !(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">Acesse seu painel ou o app do seu personal.</p>
      {isDemo && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Modo demonstração: os campos já vêm com o login do personal Felipe.
        </div>
      )}
      <LoginForm next={next} demo={isDemo ? DEMO_OWNER : undefined} />
      <p className="mt-6 text-center text-sm text-zinc-500">
        É personal e ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-zinc-900 underline">
          Criar conta
        </Link>
      </p>
    </>
  );
}
