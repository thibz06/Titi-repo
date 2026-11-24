"use client";

import { ArrowDown, ArrowLeft, ArrowUp, CloudRain, Lock, LockOpen, Minus, Plus, RefreshCw, Route, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { PlanData } from "@/content/load";
import { fill, getMessages } from "@/i18n";
import { formatDateFr } from "@/lib/places/format";
import { FAMILIES, type Family } from "@/lib/places/types";
import {
  addStop,
  DAY_START,
  daysBetween,
  generateTrip,
  moveStop,
  optimizeDay,
  rainPlan,
  regenerateDay,
  removeStop,
  toggleLock,
} from "@/lib/planner/engine";
import { makeTravelLookup, startKey } from "@/lib/planner/travel";
import { VARIANTS, type Answers, type DayPlan, type Pace, type Variant } from "@/lib/planner/types";
import { useVisits } from "@/lib/progress/store";
import { tripStore, useTrip, type Trip } from "@/lib/trip/store";
import { formatEur, useRate, type Rate } from "@/lib/useRate";
import { FamilyBadge } from "./FamilyBadge";
import { Notice } from "./States";

const t = getMessages();
const mur = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const clock = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
const hours = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`);
const BUDGETS_EUR = [0, 10, 15, 25, 50] as const;

function money(valueMur: number, rate: Rate | null) {
  return rate ? `${mur.format(valueMur)} Rs (${formatEur(valueMur, rate)})` : `${mur.format(valueMur)} Rs`;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-2 text-left font-semibold ${active ? "bg-passe text-white" : "bg-brume text-encre"}`}
    >
      {children}
    </button>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-brume p-2 pl-4">
      <span className="font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" aria-label={`${t.trip.less} : ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid h-11 w-11 place-items-center rounded-full bg-passe text-white disabled:opacity-40">
          <Minus size={20} aria-hidden />
        </button>
        <span className="w-8 text-center font-display text-2xl font-semibold" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={`${t.trip.more} : ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-11 w-11 place-items-center rounded-full bg-passe text-white disabled:opacity-40">
          <Plus size={20} aria-hidden />
        </button>
      </span>
    </div>
  );
}

interface Draft {
  startDate: string;
  endDate: string;
  startSlug: string;
  car: boolean;
  budgetEur: number | null;
  adults: number;
  children: number;
  likes: Family[];
  pace: Pace;
  maxDriveMin: number;
  avoidFamilies: Family[];
  style: -1 | 0 | 1;
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Questionnaire : une question par écran, valeurs par défaut partout, on peut passer. */
function Questionnaire({ data, rate, onDone }: { data: PlanData; rate: Rate | null; onDone: (draft: Draft) => void }) {
  const families = FAMILIES.filter((f) => data.places.some((p) => p.family === f));
  const [step, setStep] = useState(0);
  const [refine, setRefine] = useState(false);
  const [d, setD] = useState<Draft>({
    startDate: "2026-12-21",
    endDate: "2027-01-07",
    startSlug: data.starts.find((s) => s.slug === "grand-baie")?.slug ?? data.starts[0]?.slug ?? "",
    car: true,
    budgetEur: 15,
    adults: 2,
    children: 2,
    likes: [],
    pace: "normal",
    maxDriveMin: 120,
    avoidFamilies: [],
    style: 0,
  });
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const nights = daysBetween(d.startDate, d.endDate).length;
  const datesOk = d.startDate <= d.endDate && nights >= 1 && nights <= 31;

  const steps: { title: string; hint?: string; body: ReactNode; valid?: boolean }[] = [
    {
      title: t.trip.qDates,
      valid: datesOk,
      body: (
        <div className="space-y-3">
          {(["startDate", "endDate"] as const).map((key) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-brume p-2 pl-4 font-semibold">
              {key === "startDate" ? t.trip.dateFrom : t.trip.dateTo}
              <input id={`trip-${key}`} type="date" value={d[key]} onChange={(e) => set(key, e.target.value)} className="h-11 rounded-xl bg-white px-3 text-base" />
            </label>
          ))}
          {!datesOk ? <p role="alert" className="text-sm font-semibold text-[#9c2f17]">{t.trip.datesError}</p> : null}
        </div>
      ),
    },
    {
      title: t.trip.qStart,
      hint: t.trip.qStartHint,
      body: (
        <div className="space-y-2">
          {data.starts.map((s) => (
            <Choice key={s.slug} active={d.startSlug === s.slug} onClick={() => set("startSlug", s.slug)}>
              {s.name}
            </Choice>
          ))}
        </div>
      ),
    },
    {
      title: t.trip.qTransport,
      hint: t.trip.transportNote,
      body: (
        <div className="space-y-2">
          <Choice active={d.car} onClick={() => set("car", true)}>{t.trip.transportCar}</Choice>
          <Choice active={!d.car} onClick={() => set("car", false)}>{t.trip.transportOther}</Choice>
        </div>
      ),
    },
    {
      title: t.trip.qBudget,
      hint: t.trip.budgetNote,
      body: (
        <div className="space-y-2">
          {BUDGETS_EUR.map((eur) => (
            <Choice key={eur} active={d.budgetEur === eur} onClick={() => set("budgetEur", eur)}>
              {eur === 0 ? t.trip.budgetFree : fill(t.trip.budgetEur, { eur })}
              {eur > 0 && rate ? <span className="ml-auto text-sm font-medium opacity-90">≈ {mur.format(eur * rate.murPerEur)} Rs</span> : null}
            </Choice>
          ))}
          <Choice active={d.budgetEur === null} onClick={() => set("budgetEur", null)}>{t.trip.budgetNone}</Choice>
          {!rate ? <p className="text-sm">{t.trip.budgetNoRate}</p> : null}
        </div>
      ),
    },
    {
      title: t.trip.qGroup,
      body: (
        <div className="space-y-2">
          <Stepper label={t.trip.adults} value={d.adults} min={1} max={12} onChange={(v) => set("adults", v)} />
          <Stepper label={t.trip.children} value={d.children} min={0} max={12} onChange={(v) => set("children", v)} />
        </div>
      ),
    },
    {
      title: t.trip.qLikes,
      hint: t.trip.qLikesHint,
      body: (
        <div className="space-y-2">
          {families.map((f) => (
            <Choice key={f} active={d.likes.includes(f)} onClick={() => set("likes", toggle(d.likes, f))}>
              <FamilyBadge family={f} size={28} />
              {t.families[f]}
            </Choice>
          ))}
        </div>
      ),
    },
    ...(refine
      ? [
          {
            title: t.trip.qPace,
            body: (
              <div className="space-y-2">
                {(["calme", "normal", "intense"] as const).map((p) => (
                  <Choice key={p} active={d.pace === p} onClick={() => set("pace", p)}>
                    {p === "calme" ? t.trip.paceCalme : p === "normal" ? t.trip.paceNormal : t.trip.paceIntense}
                  </Choice>
                ))}
              </div>
            ),
          },
          {
            title: t.trip.qDrive,
            body: (
              <div className="space-y-2">
                {[60, 90, 120, 180, 240].map((m) => (
                  <Choice key={m} active={d.maxDriveMin === m} onClick={() => set("maxDriveMin", m)}>
                    {fill(t.trip.driveValue, { h: hours(m) })}
                  </Choice>
                ))}
              </div>
            ),
          },
          {
            title: t.trip.qAvoid,
            body: (
              <div className="space-y-2">
                {families.map((f) => (
                  <Choice key={f} active={d.avoidFamilies.includes(f)} onClick={() => set("avoidFamilies", toggle(d.avoidFamilies, f))}>
                    <FamilyBadge family={f} size={28} />
                    {t.families[f]}
                  </Choice>
                ))}
              </div>
            ),
          },
          {
            title: t.trip.qStyle,
            body: (
              <div className="space-y-2">
                <Choice active={d.style === -1} onClick={() => set("style", -1)}>{t.trip.styleKnown}</Choice>
                <Choice active={d.style === 0} onClick={() => set("style", 0)}>{t.trip.styleMix}</Choice>
                <Choice active={d.style === 1} onClick={() => set("style", 1)}>{t.trip.styleOffbeat}</Choice>
              </div>
            ),
          },
        ]
      : []),
  ];
  const current = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <section className="glass rounded-3xl p-5">
      <p className="text-sm font-semibold text-passe">{fill(t.trip.step, { n: step + 1, total: steps.length })}</p>
      <div role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} aria-label={t.trip.introTitle} className="mt-2 h-2 overflow-hidden rounded-full bg-encre/15">
        <div className="h-full rounded-full bg-passe transition-[width] duration-200" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <h2 className="mt-4 font-display text-2xl font-semibold">{current.title}</h2>
      {current.hint ? <p className="mt-1 text-sm text-encre/85">{current.hint}</p> : null}
      <div className="mt-4">{current.body}</div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="inline-flex min-h-12 items-center rounded-full bg-brume px-5 font-semibold">
            {t.trip.back}
          </button>
        ) : null}
        {!last ? (
          <>
            <button type="button" disabled={current.valid === false} onClick={() => setStep(step + 1)} className="inline-flex min-h-12 items-center rounded-full bg-passe px-6 font-semibold text-white disabled:opacity-40">
              {t.trip.next}
            </button>
            <button type="button" disabled={current.valid === false} onClick={() => setStep(step + 1)} className="inline-flex min-h-12 items-center px-3 font-semibold underline disabled:opacity-40">
              {t.trip.skip}
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={!datesOk} onClick={() => onDone(d)} className="inline-flex min-h-12 items-center rounded-full bg-passe px-6 font-semibold text-white disabled:opacity-40">
              {t.trip.finish}
            </button>
            {!refine ? (
              <button type="button" onClick={() => { setRefine(true); setStep(step + 1); }} className="inline-flex min-h-12 items-center px-3 font-semibold underline">
                {t.trip.refine}
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function DayEditor({ trip, index, data, rate, onChange, onBack }: { trip: Trip; index: number; data: PlanData; rate: Rate | null; onChange: (day: DayPlan) => void; onBack: () => void }) {
  const travel = useMemo(() => makeTravelLookup(data.matrix), [data.matrix]);
  const byslug = useMemo(() => new Map(data.places.map((p) => [p.slug, p])), [data.places]);
  const day = trip.days[trip.variant][index]!;
  const [seed, setSeed] = useState(trip.seed + 1);
  const [rainEmpty, setRainEmpty] = useState(false);
  const usedElsewhere = trip.days[trip.variant].flatMap((d, i) => (i === index ? [] : d.stops.map((s) => s.slug)));
  const holiday = data.holidays.find((h) => h.day === day.date);
  const available = data.places.filter((p) => !day.stops.some((s) => s.slug === p.slug)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const start = data.starts.find((s) => startKey(s.slug) === trip.answers.startSlug);
  const args = [data.places, travel, trip.answers] as const;

  const routeUrl = (() => {
    if (!start || day.stops.length === 0) return null;
    const home = `${start.lat},${start.lng}`;
    const points = day.stops.map((s) => byslug.get(s.slug)).filter((p) => !!p);
    const params = new URLSearchParams({ api: "1", origin: home, destination: home, travelmode: "driving", waypoints: points.map((p) => `${p.lat},${p.lng}`).join("|") });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  })();

  return (
    <div>
      <button type="button" onClick={onBack} className="glass glass-strong inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold">
        <ArrowLeft size={20} aria-hidden />
        {t.trip.backToTrip}
      </button>

      <section className="glass mt-3 rounded-3xl p-5">
        <p className="text-sm font-semibold uppercase tracking-widest text-passe">
          {fill(t.trip.dayTitle, { n: index + 1 })} · {t.trip.variants[trip.variant]}
        </p>
        <h2 className="mt-1 font-display text-3xl font-semibold">{formatDateFr(day.date)}</h2>
        {holiday ? <p className="mt-1 font-semibold text-[#9c2f17]">{fill(t.trip.holiday, { label: holiday.label })}</p> : null}
        <DayTotals day={day} rate={rate} />
      </section>

      {day.stops.length === 0 ? (
        <div className="mt-3">
          <Notice title={t.trip.emptyDay} />
        </div>
      ) : (
        <ol className="mt-3 space-y-2">
          <li className="px-2 text-sm font-semibold">{fill(t.trip.leaveAt, { time: clock(DAY_START) })}</li>
          {day.stops.map((stop, i) => {
            const place = byslug.get(stop.slug);
            if (!place) return null;
            const lunchBefore = day.lunchAt !== null && day.lunchAt <= stop.arrive && (i === 0 || day.lunchAt >= day.stops[i - 1]!.leave);
            return (
              <li key={stop.slug}>
                {lunchBefore ? <p className="px-2 pb-2 text-sm font-semibold">{fill(t.trip.lunch, { time: clock(day.lunchAt as number) })}</p> : null}
                <p className="px-2 pb-1 text-sm text-encre/85">{fill(t.trip.travel, { min: stop.travelMin })}</p>
                <div className={`glass rounded-3xl p-3 ${stop.flags.includes("ferme") ? "outline outline-2 outline-corail" : ""}`}>
                  <div className="flex items-center gap-3">
                    <FamilyBadge family={place.family} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-passe">
                        {clock(stop.arrive)} – {clock(stop.leave)}
                        {stop.locked ? ` · ${t.trip.locked}` : ""}
                      </p>
                      <Link href={`/lieu/${place.slug}`} className="block truncate font-display text-lg font-semibold underline-offset-2 hover:underline">
                        {place.name}
                      </Link>
                    </div>
                  </div>
                  {stop.flags.length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-sm">
                      {stop.flags.map((flag) => (
                        <li key={flag} className={flag === "ferme" ? "font-semibold text-[#9c2f17]" : "text-encre/85"}>
                          {t.trip.flags[flag]}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-2 flex gap-1.5">
                    <IconButton label={fill(t.trip.moveUp, { name: place.name })} disabled={i === 0} onClick={() => onChange(moveStop(day, i, i - 1, ...args))}>
                      <ArrowUp size={20} aria-hidden />
                    </IconButton>
                    <IconButton label={fill(t.trip.moveDown, { name: place.name })} disabled={i === day.stops.length - 1} onClick={() => onChange(moveStop(day, i, i + 1, ...args))}>
                      <ArrowDown size={20} aria-hidden />
                    </IconButton>
                    <IconButton label={fill(stop.locked ? t.trip.unlock : t.trip.lock, { name: place.name })} pressed={stop.locked} onClick={() => onChange(toggleLock(day, stop.slug))}>
                      {stop.locked ? <Lock size={20} aria-hidden /> : <LockOpen size={20} aria-hidden />}
                    </IconButton>
                    <IconButton label={fill(t.trip.remove, { name: place.name })} onClick={() => onChange(removeStop(day, stop.slug, ...args))}>
                      <Trash2 size={20} aria-hidden />
                    </IconButton>
                  </div>
                </div>
              </li>
            );
          })}
          {day.lunchAt !== null && day.lunchAt >= day.stops.at(-1)!.leave ? <li className="px-2 text-sm font-semibold">{fill(t.trip.lunch, { time: clock(day.lunchAt) })}</li> : null}
          <li className="px-2 text-sm font-semibold">{fill(t.trip.returnHome, { min: day.returnTravelMin, time: clock(day.totals.endAt + day.returnTravelMin) })}</li>
        </ol>
      )}

      <section className="glass mt-4 space-y-2 rounded-3xl p-4">
        <label className="block font-semibold" htmlFor="trip-add">
          {t.trip.add}
        </label>
        <select
          id="trip-add"
          value=""
          onChange={(e) => e.target.value && onChange(addStop(day, e.target.value, ...args))}
          className="h-12 w-full rounded-2xl bg-white px-3 text-base"
        >
          <option value="">{t.trip.addPlaceholder}</option>
          {available.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-1 gap-2 pt-1">
          <ActionButton icon={<Sparkles size={20} aria-hidden />} onClick={() => onChange(optimizeDay(day, ...args))}>
            {t.trip.optimize}
          </ActionButton>
          <ActionButton
            icon={<CloudRain size={20} aria-hidden />}
            onClick={() => {
              const next = rainPlan(day, data.places, travel, trip.answers, usedElsewhere, seed);
              setRainEmpty(next.stops.length === 0);
              if (next.stops.length > 0) onChange(next);
            }}
          >
            {t.trip.rain}
          </ActionButton>
          <ActionButton
            icon={<RefreshCw size={20} aria-hidden />}
            onClick={() => {
              onChange(regenerateDay(day, data.places, travel, trip.answers, usedElsewhere, seed));
              setSeed(seed + 1);
            }}
          >
            {t.trip.regenerate}
          </ActionButton>
          {routeUrl ? (
            <a href={routeUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-passe px-5 font-semibold text-white">
              <Route size={20} aria-hidden />
              {t.trip.openRoute}
            </a>
          ) : null}
        </div>
        {rainEmpty ? <p role="status" className="text-sm font-semibold">{t.trip.rainNone}</p> : null}
      </section>
    </div>
  );
}

function IconButton({ label, onClick, disabled, pressed, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-11 flex-1 place-items-center rounded-full disabled:opacity-35 ${pressed ? "bg-passe text-white" : "bg-brume"}`}
    >
      {children}
    </button>
  );
}

function ActionButton({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brume px-5 font-semibold">
      {icon}
      {children}
    </button>
  );
}

function DayTotals({ day, rate }: { day: DayPlan; rate: Rate | null }) {
  const { costPerPersonMur: cost, unknownPrices, driveMin } = day.totals;
  return (
    <p className="mt-2 text-sm">
      {fill(t.trip.stopsCount, { count: day.stops.length })} · {fill(t.trip.drive, { value: hours(driveMin) })} ·{" "}
      {cost > 0 ? fill(t.trip.cost, { value: money(cost, rate) }) : unknownPrices === 0 ? t.trip.costFree : null}
      {unknownPrices > 0 ? `${cost > 0 ? " + " : ""}${fill(t.trip.costUnknown, { count: unknownPrices })}` : ""}
    </p>
  );
}

export function TripView({ data }: { data: PlanData }) {
  const trip = useTrip();
  const rate = useRate();
  const visits = useVisits();
  const [asking, setAsking] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const travel = useMemo(() => makeTravelLookup(data.matrix), [data.matrix]);
  const ready = data.matrix.slugs.length > 0 && data.starts.length > 0;

  function build(d: Draft) {
    const answers: Answers = {
      startDate: d.startDate,
      endDate: d.endDate,
      startSlug: startKey(d.startSlug),
      budgetPerPersonMur: d.budgetEur === null ? null : d.budgetEur === 0 ? 0 : rate ? Math.round(d.budgetEur * rate.murPerEur) : null,
      adults: d.adults,
      children: d.children,
      likes: d.likes,
      pace: d.pace,
      maxDriveMin: d.maxDriveMin,
      avoidFamilies: d.avoidFamilies,
      avoidSlugs: [],
      mustSlugs: [],
      style: d.style,
      holidays: data.holidays.map((h) => h.day),
      visitedSlugs: visits.map((v) => v.slug),
    };
    const seed = 1;
    const days = Object.fromEntries(VARIANTS.map((v) => [v, generateTrip(data.places, travel, answers, v, seed)])) as Record<Variant, DayPlan[]>;
    tripStore.write({ answers, budgetEur: d.budgetEur, rateDate: rate?.date ?? null, seed, variant: "equilibre", days, createdAt: new Date().toISOString() });
    setAsking(false);
    setOpenDay(null);
  }

  const shell = (children: ReactNode) => (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div aria-hidden className="app-backdrop fixed inset-0 -z-10" />
      <h1 className="px-1 font-display text-4xl font-semibold">{t.trip.title}</h1>
      <div className="mt-5">{children}</div>
    </main>
  );

  if (!ready) return shell(<Notice title={t.trip.introTitle}>{t.trip.noData}</Notice>);
  if (asking) return shell(<Questionnaire data={data} rate={rate} onDone={build} />);
  if (!trip) {
    return shell(
      <Notice
        title={t.trip.introTitle}
        action={
          <button type="button" onClick={() => setAsking(true)} className="inline-flex min-h-12 items-center rounded-full bg-passe px-6 text-lg font-semibold text-white">
            {t.trip.start}
          </button>
        }
      >
        {t.trip.introBody}
      </Notice>,
    );
  }

  const days = trip.days[trip.variant];
  if (openDay !== null && days[openDay]) {
    return shell(
      <DayEditor
        trip={trip}
        index={openDay}
        data={data}
        rate={rate}
        onBack={() => setOpenDay(null)}
        onChange={(day) => tripStore.write({ ...trip, days: { ...trip.days, [trip.variant]: days.map((x, i) => (i === openDay ? day : x)) } })}
      />,
    );
  }

  const totalStops = days.reduce((n, d) => n + d.stops.length, 0);
  const computed = data.matrix.computed_at ? formatDateFr(data.matrix.computed_at) : "";
  return shell(
    <>
      <div role="group" aria-label={t.trip.variantsLabel} className="glass glass-strong flex rounded-full p-1.5">
        {VARIANTS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={trip.variant === v}
            onClick={() => tripStore.write({ ...trip, variant: v })}
            className={`min-h-11 flex-1 rounded-full text-sm font-semibold ${trip.variant === v ? "bg-passe text-white" : ""}`}
          >
            {t.trip.variants[v]}
          </button>
        ))}
      </div>
      <p className="mt-3 px-1 font-semibold">{fill(t.trip.summary, { days: days.length, stops: totalStops })}</p>

      <ol className="mt-3 space-y-3">
        {days.map((day, i) => {
          const holiday = data.holidays.find((h) => h.day === day.date);
          return (
            <li key={day.date}>
              <button type="button" onClick={() => setOpenDay(i)} className="glass block w-full rounded-3xl p-4 text-left">
                <p className="text-sm font-semibold uppercase tracking-widest text-passe">
                  {fill(t.trip.dayTitle, { n: i + 1 })} · {formatDateFr(day.date)}
                </p>
                {holiday ? <p className="text-sm font-semibold text-[#9c2f17]">{fill(t.trip.holiday, { label: holiday.label })}</p> : null}
                {day.stops.length === 0 ? (
                  <p className="mt-1">{t.trip.emptyDay}</p>
                ) : (
                  <>
                    <p className="mt-1 font-display text-lg font-semibold leading-snug">
                      {day.stops.map((s) => data.places.find((p) => p.slug === s.slug)?.name ?? s.slug).join(" → ")}
                    </p>
                    <DayTotals day={day} rate={rate} />
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <section className="glass mt-5 space-y-2 rounded-3xl p-5 text-sm leading-relaxed">
        <p className="font-semibold">{t.trip.proposal}</p>
        <p>{fill(t.trip.estimate, { source: data.matrix.source, date: computed })}</p>
        {rate ? <p>{fill(t.trip.rateNote, { date: formatDateFr(rate.date), source: rate.source })}</p> : null}
        {confirming ? (
          <div role="alert" className="space-y-2 pt-1">
            <p className="font-semibold">{t.trip.restartConfirm}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setConfirming(false); setAsking(true); }} className="inline-flex min-h-11 items-center rounded-full bg-passe px-5 font-semibold text-white">
                {t.trip.confirm}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-11 items-center rounded-full bg-brume px-5 font-semibold">
                {t.trip.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center font-semibold underline">
            {t.trip.restart}
          </button>
        )}
      </section>
    </>,
  );
}
