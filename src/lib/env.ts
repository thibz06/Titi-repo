// Variables d'environnement. Les NEXT_PUBLIC_* sont lues une par une : Next.js ne les
// remplace à la compilation que si elles sont écrites en toutes lettres.

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined,
  NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
} as const;

export type PublicEnvName = keyof typeof publicEnv;

/** Variables publiques nécessaires à la phase en cours. */
export const requiredPublicEnv: PublicEnvName[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID",
];

export function missingPublicEnv(names: PublicEnvName[] = requiredPublicEnv): PublicEnvName[] {
  return names.filter((name) => !publicEnv[name]);
}

export const hasSupabase = missingPublicEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]).length === 0;
export const hasGoogleMaps =
  missingPublicEnv(["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID"]).length === 0;
