// Règles de progression : fonctions pures, testées. Les seuils et barèmes sont de la configuration.
import type { Family, Rarity } from "@/lib/places/types";

/** XP de base par famille (10, 20 ou 30). L'effort compte, jamais le danger. */
export const XP_BASE: Record<Family, 10 | 20 | 30> = {
  plages_lagon: 10,
  villages_marches: 10,
  manger: 10,
  culture_patrimoine: 20,
  nature_parcs: 20,
  mer_activites: 20,
  sport_loisirs: 20,
  cascades_rivieres: 30,
  randos_sommets: 30,
};

export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  incontournable: 1,
  peu_connu: 1.25,
  insolite: 1.5,
  tres_confidentiel: 2,
};

export const REGION_COMPLETE_XP = 100;
export const MANUAL_CHECKINS_PER_DAY = 3;
/** Rayon de check-in par défaut, en mètres. Les plages et parcs sont étendus. */
export const DEFAULT_RADIUS_M: Record<Family, number> = {
  plages_lagon: 600,
  nature_parcs: 800,
  randos_sommets: 800,
  cascades_rivieres: 500,
  villages_marches: 500,
  culture_patrimoine: 300,
  manger: 200,
  mer_activites: 500,
  sport_loisirs: 400,
};

export const LEVELS = [
  { key: "debutant", min: 0 },
  { key: "lagons", min: 150 },
  { key: "aventurier", min: 500 },
  { key: "explorateur", min: 1200 },
  { key: "expert", min: 2500 },
] as const;
export type LevelKey = (typeof LEVELS)[number]["key"];

export interface Visit {
  slug: string;
  visitedAt: string; // ISO
  method: "gps" | "manual";
  accuracyM: number | null;
  xp: number;
}

export function xpForPlace(place: { family: Family; rarity: Rarity | null }): number {
  return Math.round(XP_BASE[place.family] * (place.rarity ? RARITY_MULTIPLIER[place.rarity] : 1));
}

export function totalXp(visits: Visit[], bonusXp = 0): number {
  return visits.reduce((sum, v) => sum + v.xp, 0) + bonusXp;
}

export function levelFor(xp: number) {
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (xp >= level.min) index = i;
  });
  const current = LEVELS[index]!;
  const next = LEVELS[index + 1] ?? null;
  return {
    key: current.key,
    index,
    next: next ? { key: next.key, min: next.min, remaining: next.min - xp } : null,
    /** Avancement vers le niveau suivant, de 0 à 1. */
    progress: next ? (xp - current.min) / (next.min - current.min) : 1,
  };
}

/** Distance à vol d'oiseau en mètres (formule de haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Dans le rayon ? On tient compte de l'imprécision du GPS, plafonnée pour qu'une position
 * très floue ne valide pas n'importe quoi.
 */
export function withinRadius(distance: number, radiusM: number, accuracyM: number | null): boolean {
  return distance <= radiusM + Math.min(accuracyM ?? 0, 150);
}

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function manualCheckinsLeft(visits: Visit[], now: Date): number {
  const today = dayKey(now.toISOString());
  const used = visits.filter((v) => v.method === "manual" && dayKey(v.visitedAt) === today).length;
  return Math.max(0, MANUAL_CHECKINS_PER_DAY - used);
}

export type CheckinResult =
  | { ok: true; visits: Visit[]; visit: Visit; regionCompleted: boolean }
  | { ok: false; reason: "already" | "manual_limit" };

/**
 * Enregistre une visite. Un lieu ne donne de l'XP qu'une fois ; le repli manuel donne le même XP,
 * limité à trois par jour.
 */
export function checkIn(
  visits: Visit[],
  place: { slug: string; family: Family; rarity: Rarity | null },
  method: "gps" | "manual",
  now: Date,
  accuracyM: number | null,
  regionSlugs: string[] = [],
): CheckinResult {
  if (visits.some((v) => v.slug === place.slug)) return { ok: false, reason: "already" };
  if (method === "manual" && manualCheckinsLeft(visits, now) === 0) return { ok: false, reason: "manual_limit" };
  const visit: Visit = { slug: place.slug, visitedAt: now.toISOString(), method, accuracyM, xp: xpForPlace(place) };
  const next = [visit, ...visits];
  const visited = new Set(next.map((v) => v.slug));
  const regionCompleted = regionSlugs.length > 0 && regionSlugs.every((s) => visited.has(s));
  return { ok: true, visits: next, visit, regionCompleted };
}

/** Régions dont tous les lieux sont visités : 100 XP chacune. */
export function completedRegions(visits: Visit[], slugsByRegion: Record<string, string[]>): string[] {
  const visited = new Set(visits.map((v) => v.slug));
  return Object.entries(slugsByRegion)
    .filter(([, slugs]) => slugs.length > 0 && slugs.every((s) => visited.has(s)))
    .map(([region]) => region);
}
