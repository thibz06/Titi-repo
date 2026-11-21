"use client";

import { createLocalStore } from "@/lib/store";
import type { Visit } from "./rules";

const EMPTY: Visit[] = [];

function isVisit(v: unknown): v is Visit {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.slug === "string" && typeof o.visitedAt === "string" && typeof o.xp === "number" && (o.method === "gps" || o.method === "manual");
}

export const visitsStore = createLocalStore<Visit[]>("mq.visits.v1", EMPTY, (raw) => (Array.isArray(raw) ? raw.filter(isVisit) : EMPTY));
export const useVisits = () => visitsStore.use();
