import type { PlaceDetail, PlaceMedia } from "./types";

/** Photo de couverture : seulement un fichier dont le crédit et la licence sont enregistrés (règle 10). */
export function coverPhoto(media: PlaceMedia[] | undefined): (PlaceMedia & { external_url: string }) | null {
  const photos = (media ?? []).filter(
    (m): m is PlaceMedia & { external_url: string } => m.kind === "photo" && !!m.external_url && !!m.credit && !!m.license,
  );
  return photos.find((m) => m.is_cover) ?? photos[0] ?? null;
}

/**
 * Lien « Y aller » au format Google Maps URLs (ouvre l'app ou le site Google Maps).
 * https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function directionsUrl(place: { lat: number; lng: number; google_place_id?: string | null }): string {
  const params = new URLSearchParams({ api: "1", destination: `${place.lat},${place.lng}` });
  if (place.google_place_id) params.set("destination_place_id", place.google_place_id);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Durée en minutes vers « 45 min », « 1 h 30 », « 1 h à 2 h ». Null si inconnue. */
export function formatDuration(min: number | null, max: number | null): string | null {
  const one = (m: number) => {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    if (h === 0) return `${rest} min`;
    return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, "0")}`;
  };
  if (min == null && max == null) return null;
  if (min != null && max != null && max !== min) return `${one(min)} à ${one(max)}`;
  return one((min ?? max) as number);
}

const mur = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export type PriceLabel = { kind: "free" } | { kind: "amount"; text: string } | { kind: "variable" } | { kind: "unknown" };

/** Prix en roupies. L'euro (taux daté) arrivera avec /api/rate. */
export function formatPriceMur(
  place: Pick<PlaceDetail, "price_kind" | "price_visitor_mur_min" | "price_visitor_mur_max">,
): PriceLabel {
  if (place.price_kind === "free") return { kind: "free" };
  const { price_visitor_mur_min: min, price_visitor_mur_max: max } = place;
  if (min != null) {
    const text = max != null && max !== min ? `${mur.format(min)} à ${mur.format(max)} Rs` : `${mur.format(min)} Rs`;
    return { kind: "amount", text };
  }
  if (place.price_kind === "variable") return { kind: "variable" };
  return { kind: "unknown" };
}

export function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso.slice(0, 10)}T00:00:00Z`),
  );
}

/**
 * Miniature d'un fichier Wikimedia Commons, à l'une des largeurs standard servies par Wikimedia.
 * Renvoie l'URL d'origine si ce n'est pas un fichier Commons au format attendu.
 */
export function commonsThumb(url: string, width: number): string {
  const match = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+\.(?:jpe?g|png))$/i.exec(url);
  if (!match) return url;
  const [, base, hash, file] = match;
  const step = [250, 500, 960, 1280].find((w) => w >= width) ?? 1280;
  return `${base}/thumb/${hash}/${file}/${step}px-${file}`;
}

/** Lien vers une recherche TikTok sur le lieu (une simple recherche : rien n'est sélectionné ni vérifié). */
export function tiktokSearchUrl(name: string): string {
  return `https://www.tiktok.com/search?q=${encodeURIComponent(`${name} île Maurice`)}`;
}

/** Toutes les photos créditées d'une fiche, la couverture en premier. */
export function creditedPhotos(media: PlaceMedia[] | undefined): (PlaceMedia & { external_url: string })[] {
  const photos = (media ?? []).filter(
    (m): m is PlaceMedia & { external_url: string } => m.kind === "photo" && !!m.external_url && !!m.credit && !!m.license,
  );
  return [...photos.filter((m) => m.is_cover), ...photos.filter((m) => !m.is_cover)];
}
