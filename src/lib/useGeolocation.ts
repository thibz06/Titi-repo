"use client";

export type GeoError = "denied" | "unavailable";
export type Position = { lat: number; lng: number; accuracyM: number };

/** Demande la position une fois. Rejette avec "denied" ou "unavailable". */
export function locate(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject("unavailable" satisfies GeoError);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy }),
      (e) => reject((e.code === e.PERMISSION_DENIED ? "denied" : "unavailable") satisfies GeoError),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: meters < 10_000 ? 1 : 0 }).format(meters / 1000)} km`;
}
