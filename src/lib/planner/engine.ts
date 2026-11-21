// Moteur de planification : fonctions pures, sans modèle de langage, déterministes à graine fixe.
// Le programme produit est une proposition modifiable ; l'app ne réserve rien.
import type { Family } from "@/lib/places/types";
import { openStateDuring } from "./hours";
import type { Answers, DayPlan, Pace, PlanPlace, Stop, StopFlag, TravelLookup, Variant } from "./types";

export const DAY_START = 9 * 60;
export const DAY_END = 18 * 60 + 30;
export const LUNCH_FROM = 12 * 60;
export const LUNCH_MIN = 60;
export const SECRET_MAX_DETOUR_MIN = 10;

/** Durée de visite utilisée quand la fiche n'en donne pas (hypothèse de planification, signalée comme telle). */
export const DEFAULT_DURATION: Record<Family, number> = {
  plages_lagon: 90,
  cascades_rivieres: 60,
  randos_sommets: 180,
  nature_parcs: 90,
  culture_patrimoine: 60,
  villages_marches: 60,
  manger: 60,
  mer_activites: 180,
  sport_loisirs: 120,
};

const STOPS_PER_DAY: Record<Pace, number> = { calme: 3, normal: 4, intense: 5 };

/** Trois variantes = trois jeux de poids. */
export const VARIANT_WEIGHTS: Record<
  Variant,
  { free: number; paid: number; priceHalfMur: number | null; secret: number; zoneRadiusMin: number; extraStops: number }
> = {
  // priceHalfMur : prix auquel la note d'un lieu payant est divisée par deux (null = le prix ne pèse pas).
  economique: { free: 1.8, paid: 0.6, priceHalfMur: 150, secret: 1, zoneRadiusMin: 30, extraStops: 0 },
  equilibre: { free: 1.2, paid: 1, priceHalfMur: 800, secret: 1.15, zoneRadiusMin: 40, extraStops: 0 },
  explorateur: { free: 1, paid: 1, priceHalfMur: null, secret: 1.7, zoneRadiusMin: 55, extraStops: 1 },
};

/** Générateur pseudo-aléatoire à graine (mulberry32) : même graine, même programme. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function durationOf(place: PlanPlace): { minutes: number; isDefault: boolean } {
  if (place.durationMin != null) return { minutes: place.durationMin, isDefault: false };
  if (place.durationMax != null) return { minutes: place.durationMax, isDefault: false };
  return { minutes: DEFAULT_DURATION[place.family], isDefault: true };
}

export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur <= last && out.length < 60) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

interface Context {
  byslug: Map<string, PlanPlace>;
  travel: TravelLookup;
  answers: Answers;
}

export interface Schedule {
  stops: Stop[];
  lunchAt: number | null;
  returnTravelMin: number;
  driveMin: number;
  costPerPersonMur: number;
  unknownPrices: number;
  endAt: number;
  /** Faisable : aucun trajet inconnu, aucune étape fermée, fin avant l'heure limite, conduite et budget tenus. */
  feasible: boolean;
}

/** Calcule les heures d'une suite d'étapes pour un jour donné. */
export function schedule(order: { slug: string; locked: boolean }[], date: string, ctx: Context): Schedule {
  const { byslug, travel, answers } = ctx;
  let t = DAY_START;
  let from = answers.startSlug;
  let lunchAt: number | null = null;
  let drive = 0;
  let cost = 0;
  let unknownPrices = 0;
  let feasible = true;
  const stops: Stop[] = [];

  for (const item of order) {
    const place = byslug.get(item.slug);
    const leg = place ? travel(from, item.slug) : null;
    if (!place || leg == null) {
      feasible = false;
      continue;
    }
    if (lunchAt === null && t >= LUNCH_FROM) {
      lunchAt = t;
      t += LUNCH_MIN;
    }
    t += leg;
    drive += leg;
    const arrive = t;
    const { minutes, isDefault } = durationOf(place);
    const leave = arrive + minutes;
    const flags: StopFlag[] = [];
    const state = openStateDuring(place.openingHours, date, arrive, leave, answers.holidays);
    if (state === "closed") {
      flags.push("ferme");
      feasible = false;
    } else if (state === "unknown") flags.push("horaires_inconnus");
    if (isDefault) flags.push("duree_par_defaut");
    if (place.priceKind === "free") {
      // gratuit : rien à ajouter
    } else if (place.priceMur != null) cost += place.priceMur;
    else {
      flags.push("prix_inconnu");
      unknownPrices += 1;
    }
    stops.push({ slug: item.slug, arrive, leave, travelMin: leg, locked: item.locked, flags });
    t = leave;
    from = item.slug;
  }
  if (lunchAt === null && t >= LUNCH_FROM) {
    lunchAt = t;
    t += LUNCH_MIN;
  }
  const back = stops.length > 0 ? travel(from, answers.startSlug) : 0;
  if (back == null) feasible = false;
  const returnTravelMin = back ?? 0;
  drive += returnTravelMin;
  if (t > DAY_END) feasible = false;
  if (drive > answers.maxDriveMin) feasible = false;
  if (answers.budgetPerPersonMur != null && cost > answers.budgetPerPersonMur) feasible = false;
  return { stops, lunchAt, returnTravelMin, driveMin: drive, costPerPersonMur: cost, unknownPrices, endAt: t, feasible };
}

function toDayPlan(date: string, variant: Variant, s: Schedule): DayPlan {
  return {
    date,
    variant,
    stops: s.stops,
    lunchAt: s.lunchAt,
    returnTravelMin: s.returnTravelMin,
    totals: { driveMin: s.driveMin, costPerPersonMur: s.costPerPersonMur, unknownPrices: s.unknownPrices, endAt: s.endAt },
  };
}

/** Note d'un lieu : intérêt × envies × poids de la variante × style × bonus non visité (+ départage à graine fixe). */
export function scorePlace(place: PlanPlace, answers: Answers, variant: Variant, jitter: number): number {
  const w = VARIANT_WEIGHTS[variant];
  let score = place.interest ?? 3;
  if (place.rarity === "incontournable") score += 0.5;
  if (answers.likes.includes(place.family)) score *= 1.6;
  if (place.priceKind === "free") score *= w.free;
  else if (place.priceMur != null && place.priceMur > 0) {
    score *= w.paid / (w.priceHalfMur ? 1 + place.priceMur / w.priceHalfMur : 1);
  }
  if (place.isSecret) score *= w.secret;
  const offbeat = place.isSecret || place.rarity === "insolite" || place.rarity === "peu_connu" || place.rarity === "tres_confidentiel";
  if (answers.style === 1) score *= offbeat ? 1.4 : 0.85;
  if (answers.style === -1) score *= offbeat ? 0.8 : place.rarity === "incontournable" ? 1.3 : 1;
  if (answers.mustSlugs.includes(place.slug)) score *= 3;
  score *= answers.visitedSlugs.includes(place.slug) ? 0.3 : 1.3;
  return score * (1 + jitter * 0.05);
}

function eligible(places: PlanPlace[], answers: Answers): PlanPlace[] {
  return places.filter(
    (p) =>
      p.slug !== answers.startSlug &&
      !answers.avoidSlugs.includes(p.slug) &&
      !answers.avoidFamilies.includes(p.family) &&
      // Un prix connu qui dépasse à lui seul le budget du jour : inutile de le proposer.
      !(answers.budgetPerPersonMur != null && p.priceMur != null && p.priceKind !== "free" && p.priceMur > answers.budgetPerPersonMur),
  );
}

type Item = { slug: string; locked: boolean };

/** Insère une étape là où elle allonge le moins le trajet, si la journée reste faisable. */
function bestInsertion(order: Item[], slug: string, date: string, ctx: Context): { order: Item[]; s: Schedule } | null {
  let best: { order: Item[]; s: Schedule } | null = null;
  for (let i = 0; i <= order.length; i++) {
    const candidate = [...order.slice(0, i), { slug, locked: false }, ...order.slice(i)];
    const s = schedule(candidate, date, ctx);
    if (s.feasible && (!best || s.driveMin < best.s.driveMin)) best = { order: candidate, s };
  }
  return best;
}

/** Réordonne par 2-opt pour raccourcir la conduite, sans déplacer une étape verrouillée. */
export function twoOpt(order: Item[], date: string, ctx: Context): Item[] {
  let current = order;
  let best = schedule(current, date, ctx);
  if (!best.feasible) return order;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < current.length - 1; i++) {
      for (let j = i + 1; j < current.length; j++) {
        if (current.slice(i, j + 1).some((item) => item.locked)) continue;
        const next = [...current.slice(0, i), ...current.slice(i, j + 1).reverse(), ...current.slice(j + 1)];
        const s = schedule(next, date, ctx);
        if (s.feasible && s.driveMin < best.driveMin - 0.5) {
          current = next;
          best = s;
          improved = true;
        }
      }
    }
  }
  return current;
}

function buildDay(
  date: string,
  variant: Variant,
  pool: { place: PlanPlace; score: number }[],
  ctx: Context,
  locked: Item[] = [],
): { order: Item[]; s: Schedule } {
  const { travel, answers } = ctx;
  const w = VARIANT_WEIGHTS[variant];
  const maxStops = STOPS_PER_DAY[answers.pace] + w.extraStops;
  let order: Item[] = locked;
  let s = schedule(order, date, ctx);
  const inRoute = () => new Set(order.map((o) => o.slug));
  const ranked = [...pool].sort((a, b) => b.score - a.score || a.place.slug.localeCompare(b.place.slug));

  // 1. Ancre : le meilleur lieu faisable ce jour-là ; la journée se limite ensuite à sa zone.
  let anchor: string | null = order[0]?.slug ?? null;
  if (!anchor) {
    for (const { place } of ranked) {
      const trial = bestInsertion(order, place.slug, date, ctx);
      if (trial) {
        ({ order, s } = trial);
        anchor = place.slug;
        break;
      }
    }
  }
  if (!anchor) return { order, s };
  const inZone = (slug: string) => {
    const leg = travel(anchor as string, slug);
    return leg != null && leg <= w.zoneRadiusMin;
  };

  // 2. Insertion au moindre coût de trajet, dans la zone, par ordre de note.
  for (const { place } of ranked) {
    if (order.length >= maxStops) break;
    if (inRoute().has(place.slug) || !inZone(place.slug)) continue;
    const trial = bestInsertion(order, place.slug, date, ctx);
    if (trial) ({ order, s } = trial);
  }

  // 3. Équilibre : au moins une étape gratuite s'il en existe une faisable.
  const isFree = (slug: string) => ctx.byslug.get(slug)?.priceKind === "free";
  if (!order.some((o) => isFree(o.slug))) {
    for (const { place } of ranked) {
      if (place.priceKind !== "free" || inRoute().has(place.slug) || !inZone(place.slug)) continue;
      const trial = bestInsertion(order, place.slug, date, ctx);
      if (trial) {
        ({ order, s } = trial);
        break;
      }
    }
  }

  // 4. Une découverte Île secrète si elle coûte moins de dix minutes de détour.
  if (!order.some((o) => ctx.byslug.get(o.slug)?.isSecret)) {
    for (const { place } of ranked) {
      if (!place.isSecret || inRoute().has(place.slug)) continue;
      const trial = bestInsertion(order, place.slug, date, ctx);
      if (trial && trial.s.driveMin - s.driveMin <= SECRET_MAX_DETOUR_MIN) {
        ({ order, s } = trial);
        break;
      }
    }
  }

  // 5. Raccourcir par 2-opt.
  order = twoOpt(order, date, ctx);
  s = schedule(order, date, ctx);

  // 6. Finir par un coucher de soleil si l'ordre reste faisable.
  const sunset = order.findIndex((o) => !o.locked && ctx.byslug.get(o.slug)?.tags.includes("coucher_soleil"));
  if (sunset >= 0 && sunset !== order.length - 1 && !order.slice(sunset).some((o) => o.locked)) {
    const moved = [...order.slice(0, sunset), ...order.slice(sunset + 1), order[sunset] as Item];
    const trial = schedule(moved, date, ctx);
    if (trial.feasible) {
      order = moved;
      s = trial;
    }
  }
  return { order, s };
}

/** Programme du séjour pour une variante : une zone par jour, aucun lieu en double. */
export function generateTrip(places: PlanPlace[], travel: TravelLookup, answers: Answers, variant: Variant, seed = 1): DayPlan[] {
  const random = seededRandom(seed + VARIANTS_INDEX[variant] * 7919);
  const byslug = new Map(places.map((p) => [p.slug, p]));
  const ctx: Context = { byslug, travel, answers };
  const scored = eligible(places, answers).map((place) => ({ place, score: scorePlace(place, answers, variant, random()) }));
  const used = new Set<string>();
  const days: DayPlan[] = [];
  let previousRegion: string | null = null;

  for (const date of daysBetween(answers.startDate, answers.endDate)) {
    // Alterner les zones : la région de la veille est moins prioritaire.
    const pool = scored
      .filter((x) => !used.has(x.place.slug))
      .map((x) => (x.place.region === previousRegion ? { ...x, score: x.score * 0.6 } : x));
    const { order, s } = buildDay(date, variant, pool, ctx);
    order.forEach((o) => used.add(o.slug));
    previousRegion = order[0] ? (byslug.get(order[0].slug)?.region ?? null) : previousRegion;
    days.push(toDayPlan(date, variant, s));
  }
  return days;
}

const VARIANTS_INDEX: Record<Variant, number> = { economique: 0, equilibre: 1, explorateur: 2 };

// ---------------------------------------------------------------------------
// Modifier une journée
// ---------------------------------------------------------------------------

function contextFor(places: PlanPlace[], travel: TravelLookup, answers: Answers): Context {
  return { byslug: new Map(places.map((p) => [p.slug, p])), travel, answers };
}

const items = (day: DayPlan): Item[] => day.stops.map((s) => ({ slug: s.slug, locked: s.locked }));

/** Recalcule les heures d'une journée après une modification manuelle (l'ordre est respecté tel quel). */
export function reschedule(day: DayPlan, order: Item[], places: PlanPlace[], travel: TravelLookup, answers: Answers): DayPlan {
  return toDayPlan(day.date, day.variant, schedule(order, day.date, contextFor(places, travel, answers)));
}

export function removeStop(day: DayPlan, slug: string, places: PlanPlace[], travel: TravelLookup, answers: Answers): DayPlan {
  return reschedule(day, items(day).filter((i) => i.slug !== slug), places, travel, answers);
}

export function moveStop(day: DayPlan, from: number, to: number, places: PlanPlace[], travel: TravelLookup, answers: Answers): DayPlan {
  const order = items(day);
  const [moved] = order.splice(from, 1);
  if (!moved) return day;
  order.splice(to, 0, moved);
  return reschedule(day, order, places, travel, answers);
}

export function toggleLock(day: DayPlan, slug: string): DayPlan {
  return { ...day, stops: day.stops.map((s) => (s.slug === slug ? { ...s, locked: !s.locked } : s)) };
}

/** Ajoute une étape au meilleur endroit ; si aucune position n'est faisable, l'ajoute en fin de journée (signalée). */
export function addStop(day: DayPlan, slug: string, places: PlanPlace[], travel: TravelLookup, answers: Answers): DayPlan {
  if (day.stops.some((s) => s.slug === slug)) return day;
  const ctx = contextFor(places, travel, answers);
  const best = bestInsertion(items(day), slug, day.date, ctx);
  return best ? toDayPlan(day.date, day.variant, best.s) : reschedule(day, [...items(day), { slug, locked: false }], places, travel, answers);
}

/** « Optimiser ma journée » : 2-opt, les étapes verrouillées ne bougent pas. */
export function optimizeDay(day: DayPlan, places: PlanPlace[], travel: TravelLookup, answers: Answers): DayPlan {
  const ctx = contextFor(places, travel, answers);
  return toDayPlan(day.date, day.variant, schedule(twoOpt(items(day), day.date, ctx), day.date, ctx));
}

/** Un lieu est-il adapté à la pluie ? Seulement si la fiche le dit, ou si c'est un lieu de culture (musée, patrimoine couvert). */
export const isRainFriendly = (p: PlanPlace) => p.rainOk === true || p.tags.includes("pluie_ok") || (p.rainOk !== false && p.family === "culture_patrimoine");

/** « Plan B pluie » : garde les étapes verrouillées et celles adaptées à la pluie, remplace les autres. */
export function rainPlan(day: DayPlan, places: PlanPlace[], travel: TravelLookup, answers: Answers, exclude: string[] = [], seed = 1): DayPlan {
  const ctx = contextFor(places, travel, answers);
  const random = seededRandom(seed);
  const keep = items(day)
    .filter((i) => i.locked || isRainFriendly(ctx.byslug.get(i.slug) as PlanPlace))
    .map((i) => ({ ...i, locked: true }));
  const pool = eligible(places, answers)
    .filter((p) => isRainFriendly(p) && !exclude.includes(p.slug) && !keep.some((k) => k.slug === p.slug))
    .map((place) => ({ place, score: scorePlace(place, answers, day.variant, random()) }));
  const { s } = buildDay(day.date, day.variant, pool, ctx, keep);
  const wasLocked = new Set(day.stops.filter((x) => x.locked).map((x) => x.slug));
  return toDayPlan(day.date, day.variant, { ...s, stops: s.stops.map((x) => ({ ...x, locked: wasLocked.has(x.slug) })) });
}

/** « Générer une nouvelle journée » : garde les étapes verrouillées, retire les autres du tirage. */
export function regenerateDay(day: DayPlan, places: PlanPlace[], travel: TravelLookup, answers: Answers, exclude: string[], seed: number): DayPlan {
  const ctx = contextFor(places, travel, answers);
  const random = seededRandom(seed);
  const keep = items(day).filter((i) => i.locked);
  const dropped = new Set(day.stops.filter((s) => !s.locked).map((s) => s.slug));
  const pool = eligible(places, answers)
    .filter((p) => !exclude.includes(p.slug) && !keep.some((k) => k.slug === p.slug))
    .map((place) => ({ place, score: scorePlace(place, answers, day.variant, random()) * (dropped.has(place.slug) ? 0.2 : 1) }));
  const { s } = buildDay(day.date, day.variant, pool, ctx, keep);
  return toDayPlan(day.date, day.variant, s);
}
