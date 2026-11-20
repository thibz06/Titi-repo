"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fill, getMessages } from "@/i18n";
import { hasGoogleMaps, hasSupabase, missingPublicEnv } from "@/lib/env";
import { usePublishedPlaces } from "@/lib/places/hooks";
import { useOnline } from "@/lib/useOnline";
import { BottomSheet, type SheetSnap } from "./BottomSheet";
import { ExploreMap } from "./ExploreMap";
import { FamilyBadge } from "./FamilyBadge";
import { PlaceCard } from "./PlaceCard";
import { MissingConfig, Notice, PrimaryButton, Skeleton } from "./States";

export function Explorer() {
  const t = getMessages();
  const online = useOnline();
  const { data: places = [], isPending, isError, refetch } = usePublishedPlaces();
  const [snap, setSnap] = useState<SheetSnap>(hasGoogleMaps ? "peek" : "half");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const selected = places.find((p) => p.id === selectedId) ?? null;
  const mapUsable = hasGoogleMaps && online && !mapFailed;

  const count = places.length === 1 ? t.explore.countOne : fill(t.explore.countMany, { count: places.length });

  return (
    <div className="relative h-full overflow-hidden bg-[#9FD9DB]">
      <h1 className="sr-only">{t.explore.title}</h1>

      {mapUsable ? (
        <ExploreMap
          places={places}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setSnap("peek");
          }}
          onError={() => setMapFailed(true)}
          label={t.explore.mapLabel}
        />
      ) : (
        <div className="mx-auto max-w-md p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          {!hasGoogleMaps ? (
            <MissingConfig
              names={missingPublicEnv(["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID"])}
            />
          ) : (
            <Notice title={t.explore.mapUnavailableTitle} tone="warning">
              {online ? t.explore.mapError : t.explore.mapOffline}
            </Notice>
          )}
        </div>
      )}

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
                <p className="truncate text-sm text-encre/75">
                  {[t.families[selected.family], selected.locality].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Link
                href={`/lieu/${selected.slug}`}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-encre bg-lagon px-4 font-semibold text-encre"
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
            <p className="font-display text-xl font-semibold" aria-live="polite">
              {isPending && hasSupabase ? t.common.loading : count}
            </p>
          )
        }
      >
        {!hasSupabase ? (
          <MissingConfig names={missingPublicEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])} />
        ) : isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : isError ? (
          <Notice
            title={t.explore.errorTitle}
            tone="warning"
            action={<PrimaryButton onClick={() => refetch()}>{t.common.retry}</PrimaryButton>}
          >
            {online ? null : t.common.offline}
          </Notice>
        ) : places.length === 0 ? (
          <Notice title={t.explore.emptyTitle}>{t.explore.emptyBody}</Notice>
        ) : (
          <ul className="space-y-3">
            {places.map((place) => (
              <li key={place.id}>
                <PlaceCard place={place} />
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </div>
  );
}
