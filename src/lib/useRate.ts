"use client";

import { useEffect } from "react";
import { createLocalStore } from "./store";

export interface Rate {
  murPerEur: number;
  date: string;
  source: string;
  fetchedAt: number;
}

function isRate(raw: unknown): raw is Rate {
  const o = raw as Rate | null;
  return !!o && typeof o.murPerEur === "number" && o.murPerEur > 0 && typeof o.date === "string" && typeof o.source === "string";
}

const store = createLocalStore<Rate | null>("mq.rate.v1", null, (raw) => (isRate(raw) ? raw : null));
let pending = false;

/** Taux roupie / euro daté. Gardé sur l'appareil : reste affichable hors-ligne, avec sa date. */
export function useRate(): Rate | null {
  const rate = store.use();
  useEffect(() => {
    const fresh = rate && Date.now() - rate.fetchedAt < 12 * 3600_000;
    if (fresh || pending) return;
    pending = true;
    fetch("/api/rate")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (isRate({ ...(data as object), fetchedAt: 0 })) store.write({ ...(data as Rate), fetchedAt: Date.now() });
      })
      .catch(() => undefined)
      .finally(() => {
        pending = false;
      });
  }, [rate]);
  return rate;
}

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
export const formatEur = (mur: number, rate: Rate) => eur.format(mur / rate.murPerEur);
