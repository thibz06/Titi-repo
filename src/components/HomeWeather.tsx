"use client";

import type { PlanData } from "@/content/load";
import { START_PREFIX } from "@/lib/planner/travel";
import { useTrip } from "@/lib/trip/store";
import { WeatherCard } from "./WeatherCard";

/** Météo de la zone du logement choisie dans « Mon voyage », sinon du premier point de départ (Grand Baie). */
export function HomeWeather({ starts }: { starts: PlanData["starts"] }) {
  const trip = useTrip();
  const slug = trip?.answers.startSlug.replace(START_PREFIX, "");
  const start = starts.find((s) => s.slug === slug) ?? starts.find((s) => s.slug === "grand-baie") ?? starts[0];
  if (!start) return null;
  return <WeatherCard lat={start.lat} lng={start.lng} placeName={start.name} />;
}
