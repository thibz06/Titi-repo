"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { fill, getMessages } from "@/i18n";
import type { PlaceSummary } from "@/lib/places/types";
import { useOnline } from "@/lib/useOnline";
import { BottomSheet, type SheetSnap } from "./BottomSheet";
import { FamilyBadge } from "./FamilyBadge";
import { PlaceCard } from "./PlaceCard";
import { Notice } from "./States";

const ExploreMap = dynamic(() => import("./ExploreMap").then((m) => m.ExploreMap), { ssr: false });

export function Explorer({ places, draftCount, review = false }: { places: PlaceSummary[]; draftCount: number; review?: boolean }) {
  const t = getMessages();
  const online = useOnline();
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const selected = places.find((p) => p.id === selectedId) ?? null;
  const mapUsable = online && !mapFailed;
  const count = places.length === 1 ? t.explore.countOne : fill(t.explore.countMany, { count: places.length });

  return (
    <div className="app-backdrop relative h-full overflow-hidden">
      <h1 className="sr-only">{review ? t.review.title : t.explore.title}</h1>

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
          <Notice title={t.explore.mapUnavailableTitle} tone="warning">
            {online ? t.explore.mapError : t.explore.mapOffline}
          </Notice>
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
            <p className="font-display text-xl font-semibold">{review ? `${t.review.title} · ${count}` : count}</p>
          )
        }
      >
        {review ? (
          <div className="mb-3">
            <Notice title={t.review.bannerTitle} tone="warning">
              {t.review.bannerBody}
            </Notice>
          </div>
        ) : null}
        {places.length === 0 ? (
          <Notice
            title={t.explore.emptyTitle}
            action={
              draftCount > 0 ? (
                <Link
                  href="/relecture"
                  className="inline-flex min-h-11 items-center rounded-full bg-lagon px-5 font-semibold text-encre"
                >
                  {fill(t.explore.reviewLink, { count: draftCount })}
                </Link>
              ) : undefined
            }
          >
            {t.explore.emptyBody}
          </Notice>
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
