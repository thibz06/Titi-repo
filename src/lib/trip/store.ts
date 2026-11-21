"use client";

import { createLocalStore } from "@/lib/store";
import type { Answers, DayPlan, Variant } from "@/lib/planner/types";

export interface Trip {
  answers: Answers;
  /** Budget choisi en euros (null = sans limite) et taux utilisé pour le convertir. */
  budgetEur: number | null;
  rateDate: string | null;
  seed: number;
  variant: Variant;
  days: Record<Variant, DayPlan[]>;
  createdAt: string;
}

function isTrip(raw: unknown): raw is Trip {
  const o = raw as Trip | null;
  return !!o && typeof o === "object" && !!o.answers && !!o.days && Array.isArray(o.days.equilibre) && typeof o.variant === "string";
}

export const tripStore = createLocalStore<Trip | null>("mq.trip.v1", null, (raw) => (isTrip(raw) ? raw : null));
export const useTrip = () => tripStore.use();
