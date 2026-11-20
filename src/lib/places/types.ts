export const FAMILIES = [
  "plages_lagon",
  "cascades_rivieres",
  "randos_sommets",
  "nature_parcs",
  "culture_patrimoine",
  "villages_marches",
  "manger",
  "mer_activites",
  "sport_loisirs",
] as const;
export type Family = (typeof FAMILIES)[number];

export const REGION_CODES = ["nord", "nord_ouest", "ouest", "sud_ouest", "sud", "sud_est", "est", "centre"] as const;
export type RegionCode = (typeof REGION_CODES)[number];

export const RARITIES = ["incontournable", "peu_connu", "insolite", "tres_confidentiel"] as const;
export type Rarity = (typeof RARITIES)[number];

export type PriceKind = "free" | "paid" | "variable";

/** Colonnes chargées pour la carte et les listes. */
export interface PlaceSummary {
  id: string;
  slug: string;
  name: string;
  family: Family;
  tags: string[];
  locality: string | null;
  lat: number;
  lng: number;
  pitch: string | null;
  price_kind: PriceKind | null;
  rarity: Rarity | null;
}

export interface PlaceSource {
  id: string;
  field: string;
  url: string;
  title: string | null;
  accessed_at: string;
}

export interface PlaceMedia {
  id: string;
  kind: "photo" | "video" | "illustration";
  storage_path: string | null;
  external_url: string | null;
  credit: string;
  license: string;
  source_url: string | null;
  is_cover: boolean;
}

export interface PlaceDetail extends PlaceSummary {
  google_place_id: string | null;
  description_md: string | null;
  why_go_md: string | null;
  likes: string[];
  watchouts: string[];
  tips_md: string | null;
  duration_min: number | null;
  duration_max: number | null;
  price_visitor_mur_min: number | null;
  price_visitor_mur_max: number | null;
  price_resident_mur: number | null;
  price_note: string | null;
  opening_hours: string | null;
  hours_note: string | null;
  difficulty: number | null;
  risk_level: "low" | "medium" | "high" | null;
  risk_note: string | null;
  verified_at: string | null;
  regions: { code: RegionCode; name: string } | null;
  place_sources: PlaceSource[];
  place_media: PlaceMedia[];
}

export const SUMMARY_COLUMNS = "id,slug,name,family,tags,locality,lat,lng,pitch,price_kind,rarity";
export const DETAIL_COLUMNS =
  `${SUMMARY_COLUMNS},google_place_id,description_md,why_go_md,likes,watchouts,tips_md,duration_min,duration_max,` +
  "price_visitor_mur_min,price_visitor_mur_max,price_resident_mur,price_note,opening_hours,hours_note,difficulty," +
  "risk_level,risk_note,verified_at,regions(code,name),place_sources(id,field,url,title,accessed_at)," +
  "place_media(id,kind,storage_path,external_url,credit,license,source_url,is_cover)";
