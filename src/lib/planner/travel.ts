import type { TravelLookup } from "./types";

export interface TravelMatrix {
  source: string;
  note: string;
  computed_at: string;
  slugs: string[];
  minutes: (number | null)[][];
}

/**
 * OSRM calcule des temps sans trafic, optimistes sur les routes mauriciennes. Pour planifier, on les
 * majore : c'est une hypothèse de planification, affichée comme telle, pas une mesure.
 */
export const TRAVEL_MARGIN = 1.4;
export const START_PREFIX = "depart:";
export const startKey = (slug: string) => `${START_PREFIX}${slug}`;
const strip = (key: string) => (key.startsWith(START_PREFIX) ? key.slice(START_PREFIX.length) : key);

export function makeTravelLookup(matrix: TravelMatrix, margin = TRAVEL_MARGIN): TravelLookup {
  const index = new Map(matrix.slugs.map((slug, i) => [slug, i]));
  return (from, to) => {
    const a = index.get(strip(from));
    const b = index.get(strip(to));
    if (a === undefined || b === undefined) return null;
    if (a === b) return 0;
    const raw = matrix.minutes[a]?.[b];
    return raw == null ? null : Math.round(raw * margin);
  };
}
