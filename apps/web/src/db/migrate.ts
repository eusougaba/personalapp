// Aplica os arquivos db/migrations/*.sql em ordem, uma única vez cada.
// Funciona no Postgres embutido (desenvolvimento) e no Supabase.
import fs from "node:fs";
import path from "node:path";

export interface SqlRunner {
  exec(sql: string): Promise<unknown>;
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
}

export async function runMigrations(db: SqlRunner, dir = path.join(process.cwd(), "db", "migrations")) {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS "_app_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  );
  const done = new Set((await db.query(`SELECT "name" FROM "_app_migrations"`)).rows.map((r) => String(r.name)));

  // Banco criado fora do runner (ex.: 0000 aplicada direto no Supabase): marca como aplicada.
  if (!done.has("0000_init.sql")) {
    const t = await db.query(`SELECT to_regclass('public."Tenant"') AS t`);
    if (t.rows[0]?.t) {
      await db.exec(`INSERT INTO "_app_migrations" ("name") VALUES ('0000_init.sql') ON CONFLICT DO NOTHING`);
      done.add("0000_init.sql");
    }
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    await db.exec(`BEGIN;\n${sql}\nINSERT INTO "_app_migrations" ("name") VALUES ('${f}');\nCOMMIT;`);
    applied.push(f);
  }
  return applied;
}
