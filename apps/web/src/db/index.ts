// Conexão com o banco.
// - Com DATABASE_URL (Supabase): Postgres real via postgres-js.
// - Sem DATABASE_URL: Postgres embutido (PGlite) salvo em .data/, sem instalar nada.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { runMigrations } from "./migrate";

export type DB = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __db?: Promise<DB> };

/**
 * URL do banco. Preferência para POSTGRES_URL, criada automaticamente pela integração
 * Supabase ↔ Vercel (senha sempre correta); DATABASE_URL é a configuração manual.
 * Remove parâmetros extras (ex.: "supa=") que o Postgres não reconhece.
 */
export function databaseUrl(): string | null {
  const raw = (process.env.POSTGRES_URL || process.env.DATABASE_URL || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    for (const k of [...u.searchParams.keys()]) if (k !== "sslmode") u.searchParams.delete(k);
    return u.toString();
  } catch {
    return raw;
  }
}

async function create(): Promise<DB> {
  const url = databaseUrl();
  if (url) {
    const postgres = (await import("postgres")).default;
    // prepare:false = compatível com o pooler do Supabase (porta 6543)
    const client = postgres(url, { prepare: false, max: 5 });
    return drizzlePg(client, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await runMigrations(client);
  const db = drizzle(client, { schema }) as unknown as DB;
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db);
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__db) {
    g.__db = create().catch((e) => {
      g.__db = undefined; // permite nova tentativa na próxima requisição
      throw e;
    });
  }
  return g.__db;
}

export { schema };
