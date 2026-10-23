// npm run db:seed — cria o personal de demonstração (Felipe) em DATABASE_URL se o banco estiver vazio.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { seedIfEmpty, DEMO_OWNER } from "../src/db/seed";

async function main() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DATABASE_URL no .env.local");
  const client = postgres(url, { prepare: false, max: 1 });
  const created = await seedIfEmpty(drizzle(client, { schema }));
  console.log(created ? `Demo criada. Login: ${DEMO_OWNER.email}` : "Banco já tem dados; nada feito.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
