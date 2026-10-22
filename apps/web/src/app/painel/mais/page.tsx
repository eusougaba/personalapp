import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Icon, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/ui";

const ITEMS: { href: string; label: string; text: string; icon: IconName }[] = [
  { href: "/painel/planos", label: "Planos", text: "Mensalidades, pacotes e consultoria", icon: "tag" },
  { href: "/painel/exercicios", label: "Exercícios", text: "Biblioteca para montar treinos", icon: "dumbbell" },
  { href: "/painel/configuracoes", label: "Minha marca", text: "Cores, logo, Pix e endereço do app", icon: "settings" },
];

export default async function Mais() {
  const { tenant } = await requireOwner();
  return (
    <>
      <PageHeader title="Mais" />
      <div className="space-y-2">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50">
            <span className="rounded-xl bg-zinc-100 p-2.5 text-zinc-700"><Icon name={i.icon} /></span>
            <span className="flex-1">
              <span className="block font-medium text-zinc-900">{i.label}</span>
              <span className="block text-sm text-zinc-500">{i.text}</span>
            </span>
            <Icon name="chevronRight" className="text-zinc-400" />
          </Link>
        ))}
        <a href={`/t/${tenant.slug}`} target="_blank" className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50">
          <span className="rounded-xl bg-zinc-100 p-2.5 text-zinc-700"><Icon name="link" /></span>
          <span className="flex-1 font-medium text-zinc-900">Ver app do aluno</span>
        </a>
        <form action={logout}>
          <button className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left text-red-600 hover:bg-red-50">
            <span className="rounded-xl bg-red-50 p-2.5"><Icon name="logout" /></span>
            <span className="font-medium">Sair</span>
          </button>
        </form>
      </div>
    </>
  );
}
