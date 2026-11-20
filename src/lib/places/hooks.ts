"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/Providers";
import { getSupabase } from "@/lib/supabase/client";
import { fetchFavoriteIds, fetchFavoritePlaces, fetchPlaceBySlug, fetchPublishedPlaces, setFavorite } from "./queries";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase non configuré");
  return sb;
}

export function usePublishedPlaces() {
  return useQuery({ queryKey: ["places"], queryFn: () => fetchPublishedPlaces(client()), enabled: !!getSupabase() });
}

export function usePlace(slug: string) {
  return useQuery({ queryKey: ["place", slug], queryFn: () => fetchPlaceBySlug(client(), slug), enabled: !!getSupabase() });
}

export function useFavoriteIds() {
  const session = useSession();
  const userId = session.status === "ready" ? session.userId : null;
  return useQuery({
    queryKey: ["favorites", "ids", userId],
    queryFn: () => fetchFavoriteIds(client()),
    enabled: userId !== null,
  });
}

export function useFavoritePlaces() {
  const session = useSession();
  const userId = session.status === "ready" ? session.userId : null;
  return useQuery({
    queryKey: ["favorites", "places", userId],
    queryFn: () => fetchFavoritePlaces(client()),
    enabled: userId !== null,
  });
}

export function useToggleFavorite() {
  const session = useSession();
  const userId = session.status === "ready" ? session.userId : null;
  const queryClient = useQueryClient();
  const idsKey = ["favorites", "ids", userId];
  return useMutation({
    mutationFn: ({ placeId, on }: { placeId: string; on: boolean }) => {
      if (!userId) throw new Error("Session indisponible");
      return setFavorite(client(), userId, placeId, on);
    },
    onMutate: async ({ placeId, on }) => {
      await queryClient.cancelQueries({ queryKey: idsKey });
      const previous = queryClient.getQueryData<string[]>(idsKey);
      queryClient.setQueryData<string[]>(idsKey, (ids = []) => (on ? [...new Set([...ids, placeId])] : ids.filter((id) => id !== placeId)));
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(idsKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });
}
