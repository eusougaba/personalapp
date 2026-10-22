import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";

// Entrada do app. O site institucional completo fica em /site (GitHub Pages).
export default async function Home() {
  if (await currentUserId()) redirect("/painel");
  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between px-6 py-5">
        <Logo light />
        <Link href="/entrar" className="text-sm text-zinc-300 hover:text-white">Entrar</Link>
      </header>
      <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Seu app de personal, com a sua marca.</h1>
        <p className="mt-5 max-w-xl text-lg text-zinc-400">Alunos, planos, agenda, treinos, avaliações e cobranças num só lugar. Seus alunos usam o app com o seu nome.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/cadastro" className={btn("success")}>Começar grátis por 14 dias</Link>
          <Link href="/entrar" className="inline-flex items-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-900">Já tenho conta</Link>
        </div>
      </section>
    </main>
  );
}
