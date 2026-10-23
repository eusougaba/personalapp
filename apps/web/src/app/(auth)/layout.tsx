import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-ink lg:grid-cols-[1fr_1.05fr]">
      <aside className="hidden flex-col justify-between p-12 text-paper lg:flex">
        <Link href="/">
          <Logo light />
        </Link>
        <div>
          <p className="font-display text-7xl uppercase leading-[0.92]">
            O app é da
            <br />
            <span className="text-volt">sua marca.</span>
          </p>
          <p className="mt-6 max-w-md text-zinc-400">Alunos, planos, agenda, treinos com registro de carga, anamnese e mensalidades por Pix.</p>
        </div>
        <p className="text-sm text-zinc-500">14 dias grátis · sem cartão de crédito</p>
      </aside>
      <main className="flex flex-col bg-[#F4F5F0] px-4 pb-16 pt-6 sm:pt-10 lg:justify-center lg:rounded-l-[40px]">
        <Link href="/" className="mb-8 px-2 lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      </main>
    </div>
  );
}
