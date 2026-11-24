// Schéma des brouillons de fiches (content/places/*.json). Voir content/README.md.
import { z } from "zod";
import { FAMILIES, RARITIES, REGION_CODES } from "@/lib/places/types";

export const MAURITIUS_BOUNDS = { latMin: -20.55, latMax: -19.9, lngMin: 57.28, lngMax: 57.83 } as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const url = z.string().regex(/^https?:\/\//);
const noGoogle = url.refine((u) => !/google\.[a-z.]+\/maps|maps\.google|goo\.gl|maps\.app/.test(u), {
  message: "Les données ne viennent pas de Google Maps",
});

export const sourceSchema = z.strictObject({
  field: z.string().min(1),
  url: noGoogle,
  title: z.string().min(1).nullable(),
  accessed_at: isoDate,
  evidence: z.string().min(1),
});

export const mediaSchema = z.strictObject({
  kind: z.enum(["photo", "video", "illustration"]),
  external_url: url,
  credit: z.string().min(1),
  license: z.string().min(1),
  source_url: url,
  is_cover: z.boolean(),
  /** Copie réduite hébergée dans l'app (public/photos), créée par `pnpm photos:fetch`. */
  storage_path: z.string().regex(/^\/photos\/[a-z0-9-]+\.(jpg|png)$/).nullable().optional(),
});

export const placeDraftSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  family: z.enum(FAMILIES),
  tags: z.array(z.string().regex(/^[a-z0-9_]+$/)),
  region: z.enum(REGION_CODES),
  locality: z.string().nullable(),
  lat: z.number().min(MAURITIUS_BOUNDS.latMin).max(MAURITIUS_BOUNDS.latMax),
  lng: z.number().min(MAURITIUS_BOUNDS.lngMin).max(MAURITIUS_BOUNDS.lngMax),
  coords_source_url: noGoogle,
  google_place_id: z.string().nullable(),
  pitch: z.string().max(140).nullable(),
  description_md: z.string().nullable(),
  why_go_md: z.string().nullable(),
  likes: z.array(z.string()),
  watchouts: z.array(z.string()),
  tips_md: z.string().nullable(),
  duration_min: z.number().int().positive().nullable(),
  duration_max: z.number().int().positive().nullable(),
  price_kind: z.enum(["free", "paid", "variable"]).nullable(),
  price_visitor_mur_min: z.number().nonnegative().nullable(),
  price_visitor_mur_max: z.number().nonnegative().nullable(),
  price_resident_mur: z.number().nonnegative().nullable(),
  price_note: z.string().nullable(),
  opening_hours: z.string().nullable(),
  hours_note: z.string().nullable(),
  difficulty: z.number().int().min(1).max(5).nullable(),
  accessibility: z.record(z.string(), z.unknown()).nullable(),
  best_time: z.record(z.string(), z.unknown()).nullable(),
  rain_ok: z.boolean().nullable(),
  risk_level: z.enum(["low", "medium", "high"]).nullable(),
  risk_note: z.string().nullable(),
  interest: z.number().int().min(1).max(5).nullable(),
  rarity: z.enum(RARITIES).nullable(),
  rarity_reason: z.string().nullable(),
  xp_base: z.union([z.literal(10), z.literal(20), z.literal(30)]).nullable(),
  status: z.enum(["draft", "published"]),
  verified_at: isoDate.nullable(),
  verified_by: z.string().min(1).nullable(),
  sources: z.array(sourceSchema).min(1),
  media: z.array(mediaSchema),
  open_questions: z.array(z.string()),
  /** Site officiel du lieu ou du prestataire, s'il existe. */
  website_url: url.nullable().optional(),
  /** Récit « Île secrète » : réservé aux lieux insolites. */
  secret: z
    .strictObject({
      story_md: z.string().min(1),
      why_unknown_md: z.string().nullable(),
      access_md: z.string().nullable(),
      precautions_md: z.string().nullable(),
      legal_access_checked: z.boolean(),
    })
    .nullable()
    .optional(),
});

export type PlaceDraft = z.infer<typeof placeDraftSchema>;

/** Champs factuels : s'ils sont renseignés, une source doit les couvrir. */
export const SOURCED_FIELDS = [
  "price_kind",
  "price_visitor_mur_min",
  "price_visitor_mur_max",
  "price_resident_mur",
  "opening_hours",
  "duration_min",
  "duration_max",
  "difficulty",
  "risk_level",
] as const;

/** Contrôles au-delà de la forme : chaque fait renseigné est couvert par une source. */
export function lintDraft(draft: PlaceDraft): string[] {
  const problems: string[] = [];
  const covered = new Set(draft.sources.flatMap((s) => s.field.split(/[,\s]+/)));
  for (const field of SOURCED_FIELDS) {
    if (draft[field] !== null && !covered.has(field)) problems.push(`${field} est renseigné sans source dédiée`);
  }
  if (!covered.has("coords")) problems.push("aucune source pour les coordonnées (field: coords)");
  if (draft.duration_min !== null && draft.duration_max !== null && draft.duration_max < draft.duration_min) {
    problems.push("duration_max < duration_min");
  }
  if (draft.rarity !== null && !draft.rarity_reason) problems.push("rarity sans rarity_reason");
  // Règle 2 : pas de publication sans date de vérification ni nom du vérificateur.
  if (draft.status === "published" && (!draft.verified_at || !draft.verified_by)) {
    problems.push("fiche publiée sans verified_at ou verified_by");
  }
  if (draft.status === "draft" && (draft.verified_at || draft.verified_by)) {
    problems.push("brouillon avec une date de vérification : passe-le en published ou retire la date");
  }
  if (draft.media.filter((m) => m.is_cover).length > 1) problems.push("plusieurs photos de couverture");
  return problems;
}
