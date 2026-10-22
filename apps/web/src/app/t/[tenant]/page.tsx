// Tela inicial do aluno (PWA com a marca do personal).
export default async function StudentHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-semibold">Olá! 👋</h1>
      <section className="mt-4 rounded-xl border p-4">
        <h2 className="font-medium">Treino de hoje</h2>
        <p className="text-sm text-gray-500">Em breve: sua ficha montada pelo personal.</p>
      </section>
      <section className="mt-3 rounded-xl border p-4">
        <h2 className="font-medium">Próxima aula</h2>
        <p className="text-sm text-gray-500">Em breve: sua agenda.</p>
      </section>
      <section className="mt-3 rounded-xl border p-4">
        <h2 className="font-medium">Mensalidade</h2>
        <button className="bg-brand-accent mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white">
          Pagar com Pix
        </button>
      </section>
      <p className="mt-6 text-xs text-gray-400">tenant: {tenant}</p>
    </main>
  );
}
