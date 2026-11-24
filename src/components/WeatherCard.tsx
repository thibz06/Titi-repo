"use client";

import { CloudRain, CloudSun, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  now: { temp: number | null; windKmh: number | null };
  days: Day[];
  computedAt: string;
  source: string;
}

const MAX_AGE = 20 * 60_000;

/**
 * Open-Meteo est interrogé directement depuis le téléphone (gratuit, sans clé). La réponse est gardée
 * vingt minutes sur l'appareil ; elle se recharge à l'ouverture, au retour sur l'app et sur demande.
 */
async function loadWeather(lat: number, lng: number, force: boolean): Promise<Weather> {
  const key = `mq.weather.v2:${lat.toFixed(2)},${lng.toFixed(2)}`;
  let cached: Weather | null = null;
  try {
    cached = JSON.parse(window.localStorage.getItem(key) ?? "null") as Weather | null;
  } catch {
    cached = null;
  }
  if (!force && cached && Date.now() - new Date(cached.computedAt).getTime() < MAX_AGE) return cached;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}` +
    "&current=temperature_2m,wind_speed_10m" +
    "&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max" +
    "&timezone=Indian%2FMauritius&forecast_days=3";
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error("météo indisponible");
    const json = (await res.json()) as { current?: Record<string, unknown>; daily: Record<string, (number | string | null)[]> };
    const { daily } = json;
    const num = (name: string, i: number) => (typeof daily[name]?.[i] === "number" ? (daily[name][i] as number) : null);
    const cur = (name: string) => (typeof json.current?.[name] === "number" ? (json.current[name] as number) : null);
    const data: Weather = {
      now: { temp: cur("temperature_2m"), windKmh: cur("wind_speed_10m") },
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
  } catch (error) {
    // Sans réseau, mieux vaut une prévision datée que rien : l'heure de mise à jour reste affichée.
    if (cached) return cached;
    throw error;
  }
}

/** Prévision pour la zone du logement. Toujours présentée comme une estimation, avec source et heure. */
export function WeatherCard({ lat, lng, placeName }: { lat: number; lng: number; placeName: string }) {
  const t = getMessages();
  const [state, setState] = useState<{ status: "loading" } | { status: "error" } | { status: "ok"; data: Weather }>({ status: "loading" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (force: boolean) =>
      loadWeather(lat, lng, force)
        .then((data) => setState({ status: "ok", data }))
        .catch(() => setState((prev) => (prev.status === "ok" ? prev : { status: "error" }))),
    [lat, lng],
  );

  useEffect(() => {
    void load(false);
    const onVisible = () => document.visibilityState === "visible" && void load(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  function refresh() {
    setBusy(true);
    void load(true).finally(() => setBusy(false));
  }

  const round = (v: number | null) => (v == null ? t.common.unknown : String(Math.round(v)));
  const time = (iso: string) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-braise">{t.weather.kicker}</p>
          <h2 className="font-display text-2xl font-semibold">{fill(t.weather.title, { place: placeName })}</h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          aria-label={busy ? t.weather.refreshing : t.weather.refresh}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brume disabled:opacity-60"
        >
          <RefreshCw size={20} aria-hidden className={busy ? "animate-spin" : ""} />
        </button>
      </div>
      {state.status === "loading" ? (
        <div aria-busy="true" aria-label={t.common.loading} className="mt-3 h-16 animate-pulse rounded-2xl bg-encre/10" />
      ) : state.status === "error" ? (
        <p className="mt-2">{t.weather.error}</p>
      ) : (
        <>
          {state.data.now?.temp != null ? (
            <p className="mt-2 font-display text-xl font-semibold">
              {fill(t.weather.now, { temp: round(state.data.now.temp), wind: round(state.data.now.windKmh) })}
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {state.data.days.map((day, i) => {
              const rainy = (day.rainProbability ?? 0) >= 50 || (day.rainMm ?? 0) >= 5;
              const Icon = rainy ? CloudRain : CloudSun;
              return (
                <li key={day.date} className="flex items-center gap-3 rounded-2xl bg-brume p-3">
                  <Icon size={28} aria-hidden className="shrink-0 text-braise" />
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
            {fill(t.weather.updated, { time: time(state.data.computedAt) })} · {fill(t.weather.estimate, { source: state.data.source })}
          </p>
        </>
      )}
      <a href="http://metservice.intnet.mu/" target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline">
        {t.weather.official}
        <ExternalLink size={16} aria-hidden />
      </a>
    </section>
  );
}
