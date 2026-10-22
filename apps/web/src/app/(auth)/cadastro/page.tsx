import Link from "next/link";
import { SignupForm } from "../forms";

export const metadata = { title: "Criar conta" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Crie seu app de personal</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">Alunos, planos, agenda, treinos e cobranças com a sua marca.</p>
      <SignupForm rootDomain={process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"} />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-zinc-900 underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
