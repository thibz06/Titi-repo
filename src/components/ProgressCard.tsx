"use client";

import { fill, getMessages } from "@/i18n";
import type { PlaceSummary } from "@/lib/places/types";
import { completedRegions, levelFor, REGION_COMPLETE_XP, totalXp } from "@/lib/progress/rules";
import { useVisits } from "@/lib/progress/store";

export function useProgress(places: PlaceSummary[]) {
  const visits = useVisits();
  const slugsByRegion: Record<string, string[]> = {};
  for (const p of places) (slugsByRegion[p.region] ??= []).push(p.slug);
  const regionsDone = completedRegions(visits, slugsByRegion);
  const xp = totalXp(visits, regionsDone.length * REGION_COMPLETE_XP);
  const known = new Set(places.map((p) => p.slug));
  return { visits, xp, level: levelFor(xp), slugsByRegion, visitedCount: visits.filter((v) => known.has(v.slug)).length };
}

/** Niveau, XP et avancement vers le niveau suivant. */
export function ProgressCard({ places }: { places: PlaceSummary[] }) {
  const t = getMessages();
  const { xp, level, visitedCount } = useProgress(places);
  return (
    <section className="glass rounded-3xl p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-passe">{t.profile.levelLabel}</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{t.levels[level.key]}</h2>
        <p className="shrink-0 font-display text-xl font-semibold">{fill(t.profile.xp, { xp })}</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level.progress * 100)}
        aria-label={t.profile.levelLabel}
        className="mt-3 h-3 overflow-hidden rounded-full bg-encre/15"
      >
        <div className="h-full rounded-full bg-passe" style={{ width: `${Math.max(3, level.progress * 100)}%` }} />
      </div>
      <p className="mt-2 text-sm">
        {level.next ? fill(t.profile.nextLevel, { remaining: level.next.remaining, level: t.levels[level.next.key] }) : t.profile.maxLevel}
      </p>
      <p className="mt-1 text-sm text-encre/85">{fill(t.profile.visitedCount, { count: visitedCount, total: places.length })}</p>
    </section>
  );
}
