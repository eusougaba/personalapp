import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:pt-10">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      </main>
    </div>
  );
}
