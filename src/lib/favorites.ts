"use client";

// Favoris gardés sur l'appareil (localStorage) : pas de compte, pas de serveur, et ça marche hors-ligne.
import { useCallback, useSyncExternalStore } from "react";

const KEY = "mq.favorites.v1";
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let snapshot: string[] | null = null;

function read(): string[] {
  if (snapshot) return snapshot;
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    snapshot = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(next: string[]): boolean {
  snapshot = next;
  let saved = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    saved = false; // stockage refusé (navigation privée) : le favori tient jusqu'à la fermeture
  }
  listeners.forEach((l) => l());
  return saved;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Slugs des lieux favoris, et une fonction pour basculer. `toggle` renvoie false si l'enregistrement a échoué. */
export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((slug: string) => {
    const current = read();
    return write(current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current]);
  }, []);
  return { ids, toggle };
}
