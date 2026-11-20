import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let client: SupabaseClient | null | undefined;

/** Client navigateur (clé anonyme uniquement). Renvoie null si Supabase n'est pas configuré. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createBrowserClient(url, key) : null;
  return client;
}
