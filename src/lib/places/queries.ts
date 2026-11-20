import type { SupabaseClient } from "@supabase/supabase-js";
import { DETAIL_COLUMNS, SUMMARY_COLUMNS, type PlaceDetail, type PlaceSummary } from "./types";

export async function fetchPublishedPlaces(sb: SupabaseClient): Promise<PlaceSummary[]> {
  const { data, error } = await sb.from("places").select(SUMMARY_COLUMNS).eq("status", "published").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PlaceSummary[];
}

export async function fetchPlaceBySlug(sb: SupabaseClient, slug: string): Promise<PlaceDetail | null> {
  const { data, error } = await sb.from("places").select(DETAIL_COLUMNS).eq("slug", slug).limit(1);
  if (error) throw new Error(error.message);
  return ((data ?? [])[0] as unknown as PlaceDetail | undefined) ?? null;
}

export async function fetchFavoriteIds(sb: SupabaseClient): Promise<string[]> {
  const { data, error } = await sb.from("favorites").select("place_id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => (row as { place_id: string }).place_id);
}

export async function fetchFavoritePlaces(sb: SupabaseClient): Promise<PlaceSummary[]> {
  const { data, error } = await sb
    .from("favorites")
    .select(`created_at, places(${SUMMARY_COLUMNS})`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => (row as unknown as { places: PlaceSummary | null }).places)
    .filter((p): p is PlaceSummary => p !== null);
}

export async function setFavorite(sb: SupabaseClient, userId: string, placeId: string, on: boolean): Promise<void> {
  const { error } = on
    ? await sb.from("favorites").upsert({ user_id: userId, place_id: placeId }, { onConflict: "user_id,place_id" })
    : await sb.from("favorites").delete().eq("user_id", userId).eq("place_id", placeId);
  if (error) throw new Error(error.message);
}
