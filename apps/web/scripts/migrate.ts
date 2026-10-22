// npm run db:migrate — aplica as migrações em DATABASE_URL (ex.: Supabase).
import postgres from "postgres";
import { runMigrations } from "../src/db/migrate";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DATABASE_URL no .env.local");
  const sql = postgres(url, { prepare: false, max: 1 });
  const applied = await runMigrations({
    exec: (q) => sql.unsafe(q),
    query: async (q) => ({ rows: (await sql.unsafe(q)) as unknown as Record<string, unknown>[] }),
  });
  console.log(applied.length ? `Aplicadas: ${applied.join(", ")}` : "Banco já está atualizado.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
