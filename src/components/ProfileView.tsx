"use client";

import Link from "next/link";
import { getMessages } from "@/i18n";
import { useFavorites } from "@/lib/favorites";
import type { PlaceSummary } from "@/lib/places/types";
import { PlaceCard } from "./PlaceCard";
import { Notice } from "./States";

export function ProfileView({ places }: { places: PlaceSummary[] }) {
  const t = getMessages();
  const { ids } = useFavorites();
  const bySlug = new Map(places.map((p) => [p.slug, p]));
  const favorites = ids.map((slug) => bySlug.get(slug)).filter((p): p is PlaceSummary => !!p);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div aria-hidden className="app-backdrop fixed inset-0 -z-10" />
      <h1 className="px-1 font-display text-4xl font-semibold">{t.profile.title}</h1>

      <section className="mt-6">
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
