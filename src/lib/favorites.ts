"use client";

import { useCallback } from "react";
import { createLocalStore } from "./store";

const EMPTY: string[] = [];
const store = createLocalStore<string[]>("mq.favorites.v1", EMPTY, (raw) =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : EMPTY,
);

/** Slugs des lieux favoris, et une fonction pour basculer. `toggle` renvoie false si l'enregistrement a échoué. */
export function useFavorites() {
  const ids = store.use();
  const toggle = useCallback((slug: string) => {
    const current = store.read();
    return store.write(current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current]);
  }, []);
  return { ids, toggle };
}
