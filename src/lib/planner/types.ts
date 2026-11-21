import type { Family, Rarity, RegionCode } from "@/lib/places/types";

/** Ce que le moteur a besoin de savoir d'un lieu. Tout champ inconnu reste null. */
export interface PlanPlace {
  slug: string;
  name: string;
  family: Family;
  region: RegionCode;
  lat: number;
  lng: number;
  tags: string[];
  priceKind: "free" | "paid" | "variable" | null;
  /** Prix visiteur en roupies par personne, null si inconnu. */
  priceMur: number | null;
  durationMin: number | null;
  durationMax: number | null;
  openingHours: string | null;
  interest: number | null;
  rarity: Rarity | null;
  isSecret: boolean;
  rainOk: boolean | null;
}

/** Temps de trajet en minutes entre deux points (slugs), null si inconnu. */
export type TravelLookup = (from: string, to: string) => number | null;

export type Variant = "economique" | "equilibre" | "explorateur";
export const VARIANTS: Variant[] = ["economique", "equilibre", "explorateur"];
export type Pace = "calme" | "normal" | "intense";

export interface Answers {
  startDate: string; // AAAA-MM-JJ
  endDate: string;
  /** Point de départ et de retour de chaque journée (slug connu de la matrice de trajets). */
  startSlug: string;
  /** Budget visites par personne et par jour, en roupies. null = pas de limite. */
  budgetPerPersonMur: number | null;
  adults: number;
  children: number;
  likes: Family[];
  pace: Pace;
  /** Conduite maximale par jour, retour compris, en minutes. */
  maxDriveMin: number;
  avoidFamilies: Family[];
  avoidSlugs: string[];
  mustSlugs: string[];
  /** -1 = lieux connus, 0 = mélange, 1 = insolite. */
  style: -1 | 0 | 1;
  /** Jours fériés (AAAA-MM-JJ) : un lieu « PH off » est fermé ces jours-là. */
  holidays: string[];
  /** Lieux déjà visités : moins prioritaires. */
  visitedSlugs: string[];
}

export type StopFlag = "prix_inconnu" | "horaires_inconnus" | "duree_par_defaut" | "ferme";

export interface Stop {
  slug: string;
  /** Minutes depuis minuit, heure de Maurice. */
  arrive: number;
  leave: number;
  travelMin: number;
  locked: boolean;
  flags: StopFlag[];
}

export interface DayPlan {
  date: string;
  variant: Variant;
  stops: Stop[];
  /** Pause déjeuner : heure de début en minutes, ou null si la journée finit avant midi. */
  lunchAt: number | null;
  returnTravelMin: number;
  totals: { driveMin: number; costPerPersonMur: number; unknownPrices: number; endAt: number };
}
