"use client";

import Link from "next/link";
import { getMessages } from "@/i18n";
import { hasSupabase, missingPublicEnv } from "@/lib/env";
import { useFavoritePlaces } from "@/lib/places/hooks";
import { PlaceCard } from "./PlaceCard";
import { useSession } from "./Providers";
import { MissingConfig, Notice, PrimaryButton, Skeleton } from "./States";

export function ProfileView() {
  const t = getMessages();
  const session = useSession();
  const { data: favorites = [], isPending, isError, refetch } = useFavoritePlaces();

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div aria-hidden className="app-backdrop fixed inset-0 -z-10" />
      <h1 className="font-display text-4xl font-semibold">{t.profile.title}</h1>

      {!hasSupabase ? (
        <div className="mt-5">
          <MissingConfig names={missingPublicEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])} />
        </div>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="font-display text-2xl font-semibold">{t.profile.favoritesTitle}</h2>
            <div className="mt-3">
              {session.status === "error" ? (
                <Notice title={t.session.error} tone="warning" />
              ) : session.status !== "ready" || isPending ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : isError ? (
                <Notice
                  title={t.profile.favoritesError}
                  tone="warning"
                  action={<PrimaryButton onClick={() => refetch()}>{t.common.retry}</PrimaryButton>}
                />
              ) : favorites.length === 0 ? (
                <Notice
                  title={t.profile.favoritesEmptyTitle}
                  action={
                    <Link
                      href="/explorer"
                      className="inline-flex min-h-11 items-center rounded-full bg-lagon px-5 font-semibold text-encre"
                    >
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
            <h2 className="font-display text-2xl font-semibold">{t.profile.sessionTitle}</h2>
            <p className="mt-2 leading-relaxed">
              {session.status === "ready" ? t.profile.sessionAnonymous : session.status === "error" ? t.session.error : t.profile.sessionLoading}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
