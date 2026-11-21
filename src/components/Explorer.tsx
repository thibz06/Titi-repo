"use client";

import { LocateFixed, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fill, getMessages } from "@/i18n";
import { FAMILIES, type Family, type PlaceSummary } from "@/lib/places/types";
import { distanceM } from "@/lib/progress/rules";
import { useVisits } from "@/lib/progress/store";
import { formatDistance, locate, type GeoError, type Position } from "@/lib/useGeolocation";
import { useOnline } from "@/lib/useOnline";
import { BottomSheet, type SheetSnap } from "./BottomSheet";
import { FamilyBadge } from "./FamilyBadge";
import { PlaceCard } from "./PlaceCard";
import { Notice } from "./States";

const ExploreMap = dynamic(() => import("./ExploreMap").then((m) => m.ExploreMap), { ssr: false });

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

type Filter = "all" | "free" | "secret" | Family;

function Chip({ active, onClick, children, dark = false }: { active: boolean; onClick: () => void; children: React.ReactNode; dark?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${
        active ? (dark ? "bg-basalte text-or" : "bg-passe text-white") : "bg-white/70 text-encre"
      }`}
    >
      {children}
    </button>
  );
}

export function Explorer({ places }: { places: PlaceSummary[] }) {
  const t = getMessages();
  const online = useOnline();
  const visits = useVisits();
  const visited = useMemo(() => new Set(visits.map((v) => v.slug)), [visits]);
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [position, setPosition] = useState<Position | null>(null);
  const [geo, setGeo] = useState<"idle" | "locating" | GeoError>("idle");

  const families = useMemo(() => FAMILIES.filter((f) => places.some((p) => p.family === f)), [places]);
  const hasSecret = places.some((p) => p.isSecret);
  const hasFree = places.some((p) => p.price_kind === "free");

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    const list = places.filter((p) => {
      if (filter === "free" && p.price_kind !== "free") return false;
      if (filter === "secret" && !p.isSecret) return false;
      if (filter !== "all" && filter !== "free" && filter !== "secret" && p.family !== filter) return false;
      if (!q) return true;
      return normalize(`${p.name} ${p.locality ?? ""} ${t.regions[p.region]} ${t.families[p.family]}`).includes(q);
    });
    if (!position) return list.map((p) => ({ place: p, distance: null as number | null }));
    return list.map((p) => ({ place: p, distance: distanceM(position, p) })).sort((a, b) => a.distance - b.distance);
  }, [places, query, filter, position, t]);

  const shownPlaces = useMemo(() => shown.map((s) => s.place), [shown]);
  const selected = shownPlaces.find((p) => p.id === selectedId) ?? null;
  const mapUsable = online && !mapFailed;
  const count = shown.length === 1 ? t.explore.countOne : fill(t.explore.countMany, { count: shown.length });
  const secretMode = filter === "secret";

  async function nearMe() {
    if (position) return setPosition(null);
    setGeo("locating");
    try {
      setPosition(await locate());
      setGeo("idle");
      setSnap("half");
    } catch (e) {
      setGeo(e === "denied" ? "denied" : "unavailable");
    }
  }

  return (
    <div className={`relative h-full overflow-hidden ${secretMode ? "bg-basalte" : "app-backdrop"}`}>
      <h1 className="sr-only">{t.explore.title}</h1>

      {mapUsable ? (
        <ExploreMap
          places={shownPlaces}
          selectedId={selectedId}
          userPosition={position}
          onSelect={(id) => {
            setSelectedId(id);
            setSnap("peek");
          }}
          onError={() => setMapFailed(true)}
          label={t.explore.mapLabel}
        />
      ) : (
        <div className="mx-auto max-w-md p-4 pt-[max(5rem,env(safe-area-inset-top))]">
          <Notice title={t.explore.mapUnavailableTitle} tone="warning">
            {online ? t.explore.mapError : t.explore.mapOffline}
          </Notice>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 mx-auto flex max-w-md gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <label className="glass glass-strong pointer-events-auto flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full px-4">
          <Search size={20} aria-hidden className="shrink-0" />
          <span className="sr-only">{t.explore.searchLabel}</span>
          <input
            id="explore-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (snap === "peek") setSnap("half");
            }}
            placeholder={t.explore.searchPlaceholder}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-encre/70"
          />
        </label>
        <button
          type="button"
          aria-pressed={!!position}
          aria-label={t.explore.nearMe}
          onClick={nearMe}
          className={`glass glass-strong pointer-events-auto grid h-12 w-12 shrink-0 place-items-center rounded-full ${position ? "!bg-passe text-white" : ""}`}
        >
          <LocateFixed size={22} aria-hidden className={geo === "locating" ? "animate-pulse" : ""} />
        </button>
      </div>

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        handleLabel={t.explore.sheetHandle}
        header={
          selected && snap === "peek" ? (
            <div className="flex items-center gap-3">
              <FamilyBadge family={selected.family} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-semibold">{selected.name}</p>
                <p className="truncate text-sm text-encre/80">
                  {[t.families[selected.family], selected.locality].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Link
                href={`/lieu/${selected.slug}`}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-lagon px-4 font-semibold text-encre"
              >
                {t.explore.seePlace}
              </Link>
              <button
                type="button"
                aria-label={t.explore.closePreview}
                onClick={() => setSelectedId(null)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
              >
                <X size={22} aria-hidden />
              </button>
            </div>
          ) : (
            <>
              <p className="font-display text-xl font-semibold" aria-live="polite">
                {count}
                {position ? <span className="ml-2 font-sans text-sm font-medium text-encre/80">{t.explore.nearMeOn}</span> : null}
              </p>
              <div role="group" aria-label={t.explore.filtersLabel} className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
                <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                  {t.explore.filterAll}
                </Chip>
                {hasFree ? (
                  <Chip active={filter === "free"} onClick={() => setFilter(filter === "free" ? "all" : "free")}>
                    {t.explore.filterFree}
                  </Chip>
                ) : null}
                {hasSecret ? (
                  <Chip dark active={secretMode} onClick={() => setFilter(secretMode ? "all" : "secret")}>
                    <span aria-hidden className={`h-2.5 w-2.5 rotate-45 ${secretMode ? "bg-or" : "bg-basalte"}`} />
                    {t.explore.filterSecret}
                  </Chip>
                ) : null}
                {families.map((f) => (
                  <Chip key={f} active={filter === f} onClick={() => setFilter(filter === f ? "all" : f)}>
                    {t.families[f]}
                  </Chip>
                ))}
              </div>
            </>
          )
        }
      >
        {geo === "locating" ? <p className="mb-3 px-1 text-sm">{t.explore.locating}</p> : null}
        {geo === "denied" || geo === "unavailable" ? (
          <div className="mb-3">
            <Notice title={t.explore.nearMe} tone="warning">
              {geo === "denied" ? t.explore.geoDenied : t.explore.geoUnavailable}
            </Notice>
          </div>
        ) : null}
        {places.length === 0 ? (
          <Notice title={t.explore.emptyTitle}>{t.explore.emptyBody}</Notice>
        ) : shown.length === 0 ? (
          <Notice
            title={t.explore.noResultTitle}
            action={
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className="inline-flex min-h-11 items-center rounded-full bg-lagon px-5 font-semibold text-encre"
              >
                {t.explore.clearFilters}
              </button>
            }
          >
            {t.explore.noResultBody}
          </Notice>
        ) : (
          <ul className="space-y-3">
            {shown.map(({ place, distance }) => (
              <li key={place.id}>
                <PlaceCard
                  place={place}
                  visited={visited.has(place.slug)}
                  note={
                    distance != null
                      ? `${fill(t.explore.distance, { value: formatDistance(distance) })} · ${t.families[place.family]}`
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </div>
  );
}
