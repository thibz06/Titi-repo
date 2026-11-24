// Lecture des fiches du dépôt (content/places). Exécuté côté serveur, à la compilation :
// les pages sont générées en statique, sans base de données.
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PlaceDetail, PlaceSummary, RegionCode } from "@/lib/places/types";
import type { PlanPlace } from "@/lib/planner/types";
import type { TravelMatrix } from "@/lib/planner/travel";
import { placeDraftSchema, type PlaceDraft } from "./schema";

// CONTENT_DIR ne sert qu'aux tests, pour compiler l'app avec des fiches fictives.
const DIR = process.env.CONTENT_DIR
  ? join(/* turbopackIgnore: true */ process.cwd(), process.env.CONTENT_DIR)
  : join(process.cwd(), "content", "places");

const REGION_NAMES: Record<RegionCode, string> = {
  nord: "Nord",
  nord_ouest: "Nord-Ouest",
  ouest: "Ouest",
  sud_ouest: "Sud-Ouest",
  sud: "Sud",
  sud_est: "Sud-Est",
  est: "Est",
  centre: "Centre",
};

function toDetail(d: PlaceDraft): PlaceDetail {
  return {
    id: d.slug,
    slug: d.slug,
    name: d.name,
    family: d.family,
    tags: d.tags,
    locality: d.locality,
    lat: d.lat,
    lng: d.lng,
    pitch: d.pitch,
    price_kind: d.price_kind,
    rarity: d.rarity,
    status: d.status,
    region: d.region,
    isSecret: !!d.secret,
    website_url: d.website_url ?? null,
    secret: d.secret
      ? {
          story_md: d.secret.story_md,
          why_unknown_md: d.secret.why_unknown_md,
          access_md: d.secret.access_md,
          precautions_md: d.secret.precautions_md,
        }
      : null,
    google_place_id: d.google_place_id,
    description_md: d.description_md,
    why_go_md: d.why_go_md,
    likes: d.likes,
    watchouts: d.watchouts,
    tips_md: d.tips_md,
    duration_min: d.duration_min,
    duration_max: d.duration_max,
    price_visitor_mur_min: d.price_visitor_mur_min,
    price_visitor_mur_max: d.price_visitor_mur_max,
    price_resident_mur: d.price_resident_mur,
    price_note: d.price_note,
    opening_hours: d.opening_hours,
    hours_note: d.hours_note,
    difficulty: d.difficulty,
    risk_level: d.risk_level,
    risk_note: d.risk_note,
    verified_at: d.verified_at,
    regions: { code: d.region, name: REGION_NAMES[d.region] },
    // Une source par URL : plusieurs champs peuvent s'appuyer sur la même page.
    place_sources: [...new Map(d.sources.map((s) => [s.url, s])).values()].map((s, i) => ({
      id: `${d.slug}-s${i}`,
      field: s.field,
      url: s.url,
      title: s.title,
      accessed_at: s.accessed_at,
    })),
    place_media: d.media.map((m, i) => ({ id: `${d.slug}-m${i}`, ...m, storage_path: m.storage_path ?? null })),
  };
}

let cache: PlaceDetail[] | null = null;

export function loadPlaces(): PlaceDetail[] {
  if (cache) return cache;
  cache = readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => toDetail(placeDraftSchema.parse(JSON.parse(readFileSync(join(DIR, f), "utf8")))))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return cache;
}

export function toSummary(p: PlaceDetail): PlaceSummary {
  const { id, slug, name, family, tags, locality, lat, lng, pitch, price_kind, rarity, status, region, isSecret, place_media } = p;
  return { id, slug, name, family, tags, locality, lat, lng, pitch, price_kind, rarity, status, region, isSecret, place_media };
}

export const loadSummaries = () => loadPlaces().map(toSummary);

// ---------------------------------------------------------------------------
// Données du planificateur
// ---------------------------------------------------------------------------

/** Points de départ proposés pour le logement (parmi les fiches existantes). */
const START_SLUGS = [
  "grand-baie",
  "pereybere",
  "trou-aux-biches",
  "mont-choisy",
  "cap-malheureux",
  "grand-gaube",
  "caudan-waterfront",
  "flic-en-flac",
  "tamarin",
  "le-morne",
  "mahebourg",
  "blue-bay",
  "belle-mare",
  "trou-d-eau-douce",
];

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function loadPlanData() {
  const drafts = readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => placeDraftSchema.parse(JSON.parse(readFileSync(join(DIR, f), "utf8"))));
  const places: PlanPlace[] = drafts.map((d) => ({
    slug: d.slug,
    name: d.name,
    family: d.family,
    region: d.region,
    lat: d.lat,
    lng: d.lng,
    tags: d.tags,
    priceKind: d.price_kind,
    priceMur: d.price_visitor_mur_min,
    durationMin: d.duration_min,
    durationMax: d.duration_max,
    openingHours: d.opening_hours,
    interest: d.interest,
    rarity: d.rarity,
    isSecret: !!d.secret,
    rainOk: d.rain_ok,
  }));
  const root = join(DIR, "..");
  const matrix = readJson<TravelMatrix>(join(root, "travel-times.json"), { source: "", note: "", computed_at: "", slugs: [], minutes: [] });
  const calendar = readJson<{ days: { day: string; kind: string; label: string }[] }>(join(root, "calendar.json"), { days: [] });
  const known = new Set(matrix.slugs);
  const starts = START_SLUGS.filter((s) => known.has(s)).map((slug) => {
    const p = drafts.find((d) => d.slug === slug);
    return { slug, name: p?.locality ?? p?.name ?? slug, lat: p?.lat ?? 0, lng: p?.lng ?? 0 };
  });
  // Sans liste configurée disponible (tests), tout lieu connu de la matrice peut servir de départ.
  const fallbackStarts = places.filter((p) => known.has(p.slug)).slice(0, 1).map((p) => ({ slug: p.slug, name: p.name, lat: p.lat, lng: p.lng }));
  return {
    places,
    matrix: { source: matrix.source, note: matrix.note, computed_at: matrix.computed_at, slugs: matrix.slugs, minutes: matrix.minutes },
    starts: starts.length > 0 ? starts : fallbackStarts,
    holidays: calendar.days.filter((d) => d.kind === "ferie").map((d) => ({ day: d.day, label: d.label })),
  };
}

export type PlanData = ReturnType<typeof loadPlanData>;
