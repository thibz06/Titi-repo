"use client";

import { Check, MapPinCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { fill, getMessages } from "@/i18n";
import type { PlaceSummary } from "@/lib/places/types";
import { checkIn, DEFAULT_RADIUS_M, distanceM, manualCheckinsLeft, REGION_COMPLETE_XP, withinRadius } from "@/lib/progress/rules";
import { useVisits, visitsStore } from "@/lib/progress/store";
import { formatDistance, locate } from "@/lib/useGeolocation";

type Problem = { kind: "far"; distance: number } | { kind: "denied" } | { kind: "unavailable" } | { kind: "save" };
type Reward = { xp: number; region: boolean };

/** Tampon de passeport : la récompense. 1,2 seconde au plus, et on peut la passer d'un tap. */
function RewardStamp({ reward, onDone }: { reward: Reward; onDone: () => void }) {
  const t = getMessages().place;
  useEffect(() => {
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <motion.button
      type="button"
      onClick={onDone}
      aria-label={t.rewardSkip}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 grid place-items-center bg-encre/55 p-6"
    >
      <motion.div
        role="status"
        initial={{ scale: 1.6, rotate: -18, opacity: 0 }}
        animate={{ scale: 1, rotate: -8, opacity: 1 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.35 }}
        className="glass glass-strong grid h-56 w-56 place-items-center rounded-full border-4 !border-passe text-center"
      >
        <div>
          <Check size={40} strokeWidth={3} aria-hidden className="mx-auto text-passe" />
          <p className="mt-1 font-display text-2xl font-semibold text-passe">{t.rewardTitle}</p>
          <p className="font-display text-3xl font-semibold">{fill(t.rewardXp, { xp: reward.xp })}</p>
          {reward.region ? <p className="mt-1 px-4 text-sm font-semibold">{t.rewardRegion}</p> : null}
        </div>
      </motion.div>
    </motion.button>
  );
}

export function CheckIn({ place, regionSlugs }: { place: PlaceSummary; regionSlugs: string[] }) {
  const t = getMessages().place;
  const visits = useVisits();
  const done = visits.some((v) => v.slug === place.slug);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const manualLeft = manualCheckinsLeft(visits, new Date());

  function record(method: "gps" | "manual", accuracyM: number | null) {
    const result = checkIn(visitsStore.read(), place, method, new Date(), accuracyM, regionSlugs);
    if (!result.ok) return;
    if (!visitsStore.write(result.visits)) return setProblem({ kind: "save" });
    setProblem(null);
    setReward({ xp: result.visit.xp + (result.regionCompleted ? REGION_COMPLETE_XP : 0), region: result.regionCompleted });
  }

  async function onCheckIn() {
    setBusy(true);
    setProblem(null);
    try {
      const pos = await locate();
      const distance = distanceM(pos, place);
      if (withinRadius(distance, DEFAULT_RADIUS_M[place.family], pos.accuracyM)) record("gps", pos.accuracyM);
      else setProblem({ kind: "far", distance });
    } catch (e) {
      setProblem({ kind: e === "denied" ? "denied" : "unavailable" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={done || busy}
        onClick={onCheckIn}
        aria-label={done ? t.checkinDone : t.checkin}
        className={`inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 font-semibold ${
          done ? "bg-filao text-white" : "bg-soleil text-encre"
        }`}
      >
        {done ? <Check size={20} strokeWidth={3} aria-hidden /> : <MapPinCheck size={20} aria-hidden className={busy ? "animate-pulse" : ""} />}
        {done ? t.checkinDone : t.checkin}
      </button>

      {busy ? (
        <p role="status" className="glass glass-strong absolute inset-x-0 bottom-[calc(100%+0.5rem)] rounded-3xl p-4 text-sm">
          {t.checkinLocating}
        </p>
      ) : null}

      {problem && !done ? (
        <div role="alert" className="glass glass-strong absolute inset-x-0 bottom-[calc(100%+0.5rem)] rounded-3xl p-4 outline outline-2 outline-corail">
          <p className="leading-snug">
            {problem.kind === "far"
              ? fill(t.checkinTooFar, { distance: formatDistance(problem.distance) })
              : problem.kind === "denied"
                ? t.checkinGeoDenied
                : problem.kind === "unavailable"
                  ? t.checkinGeoUnavailable
                  : t.checkinSaveError}
          </p>
          {problem.kind !== "save" ? (
            <p className="mt-1 text-sm text-encre/85">
              {manualLeft > 0 ? fill(t.checkinManualLeft, { count: manualLeft }) : t.checkinManualNone}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {problem.kind !== "save" && manualLeft > 0 ? (
              <button
                type="button"
                onClick={() => record("manual", null)}
                className="inline-flex min-h-11 items-center rounded-full bg-passe px-5 font-semibold text-white"
              >
                {t.checkinManual}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setProblem(null)}
              className="inline-flex min-h-11 items-center rounded-full bg-brume px-5 font-semibold text-encre"
            >
              {t.checkinCancel}
            </button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>{reward ? <RewardStamp reward={reward} onDone={() => setReward(null)} /> : null}</AnimatePresence>
    </>
  );
}
