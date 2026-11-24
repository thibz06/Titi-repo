"use client";

import { CloudRain, CloudSun, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { fill, getMessages } from "@/i18n";
import { formatDateFr } from "@/lib/places/format";

interface Day {
  date: string;
  tempMax: number | null;
  rainMm: number | null;
  rainProbability: number | null;
  windKmh: number | null;
}
interface Weather {
  days: Day[];
  computedAt: string;
  source: string;
}

const HOUR = 3600_000;

/**
 * Open-Meteo est interrogé directement depuis le téléphone (gratuit, sans clé) : pas de quota partagé
 * côté serveur. La réponse est gardée une heure sur l'appareil.
 */
async function loadWeather(lat: number, lng: number): Promise<Weather> {
  const key = `mq.weather.v1:${lat.toFixed(2)},${lng.toFixed(2)}`;
  try {
    const cached = JSON.parse(window.localStorage.getItem(key) ?? "null") as Weather | null;
    if (cached && Date.now() - new Date(cached.computedAt).getTime() < HOUR) return cached;
  } catch {
    // cache illisible : on recharge
  }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}` +
    "&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max" +
    "&timezone=Indian%2FMauritius&forecast_days=3";
  const res = await fetch(url);
  if (!res.ok) throw new Error("météo indisponible");
  const { daily } = (await res.json()) as { daily: Record<string, (number | string | null)[]> };
  const num = (name: string, i: number) => (typeof daily[name]?.[i] === "number" ? (daily[name][i] as number) : null);
  const data: Weather = {
    days: (daily.time ?? []).map((date, i) => ({
      date: String(date),
      tempMax: num("temperature_2m_max", i),
      rainMm: num("precipitation_sum", i),
      rainProbability: num("precipitation_probability_max", i),
      windKmh: num("wind_speed_10m_max", i),
    })),
    computedAt: new Date().toISOString(),
    source: "Open-Meteo",
  };
  if (data.days.length === 0) throw new Error("météo vide");
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // stockage refusé : tant pis pour le cache
  }
  return data;
}

/** Prévision pour la zone du logement. Toujours présentée comme une estimation, avec source et heure de calcul. */
export function WeatherCard({ lat, lng, placeName }: { lat: number; lng: number; placeName: string }) {
  const t = getMessages();
  const [state, setState] = useState<{ status: "loading" } | { status: "error" } | { status: "ok"; data: Weather }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadWeather(lat, lng)
      .then((data) => !cancelled && setState({ status: "ok", data }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const round = (v: number | null) => (v == null ? t.common.unknown : String(Math.round(v)));
  return (
    <section className="glass rounded-3xl p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-passe">{t.weather.kicker}</p>
      <h2 className="font-display text-2xl font-semibold">{fill(t.weather.title, { place: placeName })}</h2>
      {state.status === "loading" ? (
        <div aria-busy="true" aria-label={t.common.loading} className="mt-3 h-16 animate-pulse rounded-2xl bg-encre/10" />
      ) : state.status === "error" ? (
        <p className="mt-2">{t.weather.error}</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {state.data.days.map((day, i) => {
              const rainy = (day.rainProbability ?? 0) >= 50 || (day.rainMm ?? 0) >= 5;
              const Icon = rainy ? CloudRain : CloudSun;
              return (
                <li key={day.date} className="flex items-center gap-3 rounded-2xl bg-brume p-3">
                  <Icon size={28} aria-hidden className="shrink-0 text-passe" />
                  <div className="min-w-0">
                    <p className="font-semibold">{i === 0 ? t.weather.today : i === 1 ? t.weather.tomorrow : formatDateFr(day.date)}</p>
                    <p className="text-sm">
                      {fill(t.weather.line, { temp: round(day.tempMax), rain: round(day.rainProbability), mm: round(day.rainMm), wind: round(day.windKmh) })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-encre/85">
            {fill(t.weather.estimate, {
              source: state.data.source,
              time: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "long" }).format(new Date(state.data.computedAt)),
            })}
          </p>
        </>
      )}
      <a
        href="http://metservice.intnet.mu/"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline"
      >
        {t.weather.official}
        <ExternalLink size={16} aria-hidden />
      </a>
    </section>
  );
}
