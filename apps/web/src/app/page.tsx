import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { Logo } from "@/components/logo";

// Entrada do app. O site institucional completo fica no GitHub Pages (pasta site/).
export default async function Home() {
  if (await currentUserId()) redirect("/painel");
  return (
    <main className="flex min-h-screen flex-col bg-ink text-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo light />
        <Link href="/entrar" className="text-sm text-zinc-400 hover:text-white">Entrar</Link>
      </header>
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-24">
        <span className="mb-6 self-start rounded-full border border-ink-3 px-3.5 py-1.5 text-sm text-zinc-400">Para personal trainer autônomo e estúdios</span>
        <h1 className="font-display text-[clamp(56px,10vw,128px)] uppercase leading-[0.92]">
          Seu app.
          <br />
          <span className="text-volt">Sua</span> marca.
          <br />
          Seus alunos.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-400">Seus alunos treinam num app com o seu nome. Você cuida da agenda, dos treinos e das mensalidades num só lugar.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/cadastro" className="inline-flex min-h-12 items-center rounded-full bg-volt px-6 font-bold text-ink hover:brightness-105">Criar meu app grátis</Link>
          <Link href="/entrar" className="inline-flex min-h-12 items-center rounded-full border border-ink-3 px-6 font-semibold text-paper hover:bg-ink-2">Já tenho conta</Link>
        </div>
      </section>
    </main>
  );
}
