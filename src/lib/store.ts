"use client";

// Petit magasin de données gardé sur l'appareil (localStorage) : pas de compte, pas de serveur,
// et tout fonctionne hors-ligne.
import { useSyncExternalStore } from "react";

export function createLocalStore<T>(key: string, fallback: T, validate: (raw: unknown) => T) {
  const listeners = new Set<() => void>();
  let snapshot: T | null = null;

  const read = (): T => {
    if (snapshot !== null) return snapshot;
    try {
      const raw = window.localStorage.getItem(key);
      snapshot = raw === null ? fallback : validate(JSON.parse(raw));
    } catch {
      snapshot = fallback;
    }
    return snapshot;
  };

  /** Renvoie false si l'écriture sur l'appareil a échoué (navigation privée, stockage plein). */
  const write = (next: T): boolean => {
    snapshot = next;
    let saved = true;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      saved = false;
    }
    listeners.forEach((l) => l());
    return saved;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        snapshot = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  const use = () => useSyncExternalStore(subscribe, read, () => fallback);
  return { read, write, use };
}
