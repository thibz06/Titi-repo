"use client";

import Link from "next/link";
import { fill, getMessages } from "@/i18n";
import { useFavorites } from "@/lib/favorites";
import { formatDateFr } from "@/lib/places/format";
import { REGION_CODES, type PlaceSummary } from "@/lib/places/types";
import { PlaceCard } from "./PlaceCard";
import { ProgressCard, useProgress } from "./ProgressCard";
import { Notice } from "./States";

export function ProfileView({ places }: { places: PlaceSummary[] }) {
  const t = getMessages();
  const { ids } = useFavorites();
  const { visits, slugsByRegion } = useProgress(places);
  const bySlug = new Map(places.map((p) => [p.slug, p]));
  const favorites = ids.map((slug) => bySlug.get(slug)).filter((p): p is PlaceSummary => !!p);
  const visitedSlugs = new Set(visits.map((v) => v.slug));
  const journal = visits.map((v) => ({ visit: v, place: bySlug.get(v.slug) })).filter((x): x is { visit: (typeof visits)[number]; place: PlaceSummary } => !!x.place);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div aria-hidden className="app-backdrop fixed inset-0 -z-10" />
      <h1 className="px-1 font-display text-4xl font-semibold">{t.profile.title}</h1>

      <div className="mt-5">
        <ProgressCard places={places} />
      </div>

      <section className="glass mt-3 rounded-3xl p-5">
        <h2 className="font-display text-2xl font-semibold">{t.profile.regionsTitle}</h2>
        <ul className="mt-3 space-y-2.5">
          {REGION_CODES.filter((code) => (slugsByRegion[code]?.length ?? 0) > 0).map((code) => {
            const slugs = slugsByRegion[code] ?? [];
            const done = slugs.filter((s) => visitedSlugs.has(s)).length;
            return (
              <li key={code}>
                <div className="flex justify-between text-sm font-semibold">
                  <span>{t.regions[code]}</span>
                  <span>{fill(t.profile.regionProgress, { done, total: slugs.length })}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-encre/15">
                  <div className="h-full rounded-full bg-filao" style={{ width: `${(done / slugs.length) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-7">
        <h2 className="px-1 font-display text-2xl font-semibold">{t.profile.journalTitle}</h2>
        <div className="mt-3">
          {journal.length === 0 ? (
            <Notice title={t.profile.journalEmptyTitle}>{t.profile.journalEmptyBody}</Notice>
          ) : (
            <ul className="space-y-3">
              {journal.map(({ visit, place }) => (
                <li key={place.id}>
                  <PlaceCard
                    place={place}
                    visited
                    note={`${fill(t.place.visitedOn, { date: formatDateFr(visit.visitedAt) })} · +${visit.xp} XP · ${visit.method === "gps" ? t.profile.gps : t.profile.manual}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="px-1 font-display text-2xl font-semibold">{t.profile.favoritesTitle}</h2>
        <div className="mt-3">
          {favorites.length === 0 ? (
            <Notice
              title={t.profile.favoritesEmptyTitle}
              action={
                <Link href="/explorer" className="inline-flex min-h-11 items-center rounded-full bg-lagon px-5 font-semibold text-encre">
                  {t.profile.explore}
                </Link>
              }
            >
              {t.profile.favoritesEmptyBody}
            </Notice>
          ) : (
            <ul className="space-y-3">
              {favorites.map((place) => (
                <li key={place.id}>
                  <PlaceCard place={place} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="glass mt-8 rounded-3xl p-5">
        <h2 className="font-display text-2xl font-semibold">{t.profile.storageTitle}</h2>
        <p className="mt-2 leading-relaxed">{t.profile.storageBody}</p>
      </section>
    </main>
  );
}
