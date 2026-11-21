// Base Postgres en mémoire (PGlite + PostGIS) qui reproduit le minimum de Supabase :
// rôles anon / authenticated, schéma auth, auth.uid() lu dans les claims JWT.
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";

const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), is_anonymous boolean not null default false);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
`;

export type Actor = { role: "anon" } | { role: "authenticated"; userId: string };

export async function createTestDb() {
  const db = await PGlite.create({ extensions: { postgis } });
  await db.exec(SUPABASE_SHIM);
  const dir = new URL("../../supabase/migrations/", import.meta.url);
  for (const file of readdirSync(dir).sort()) {
    await db.exec(readFileSync(new URL(file, dir), "utf8"));
  }

  /** Exécute une requête en tant qu'anonyme ou utilisateur connecté (RLS appliquée). */
  async function as<T = Record<string, unknown>>(actor: Actor, sql: string, params: unknown[] = []): Promise<T[]> {
    return db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
        actor.role === "authenticated" ? actor.userId : "",
      ]);
      await tx.exec(`set local role ${actor.role}`);
      const res = await tx.query<T>(sql, params);
      return res.rows;
    });
  }

  /** Requête d'administration (sans RLS), pour préparer les données. */
  async function admin<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await db.query<T>(sql, params)).rows;
  }

  async function createUser(role: "user" | "editor" = "user"): Promise<string> {
    const [row] = await admin<{ id: string }>(`insert into auth.users default values returning id`);
    if (!row) throw new Error("création d'utilisateur impossible");
    if (role === "editor") await admin(`update public.profiles set role = 'editor' where id = $1`, [row.id]);
    return row.id;
  }

  return { db, as, admin, createUser };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;
