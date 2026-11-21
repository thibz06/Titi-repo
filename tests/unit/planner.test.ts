import { describe, expect, it } from "vitest";
import { FAMILIES } from "@/lib/places/types";
import {
  addStop,
  DAY_END,
  generateTrip,
  moveStop,
  optimizeDay,
  rainPlan,
  regenerateDay,
  removeStop,
  seededRandom,
  toggleLock,
} from "@/lib/planner/engine";
import { openStateDuring } from "@/lib/planner/hours";
import { VARIANTS, type Answers, type DayPlan, type PlanPlace, type TravelLookup } from "@/lib/planner/types";

// Jeu de données figé : 24 lieux fictifs sur une grille, trajets calculés à partir des positions.
const START = "depart";
const rand = seededRandom(42);
const HOURS = [null, "Mo-Su 09:00-17:00", "Mo-Fr 08:30-16:00; PH off", "Tu-Su 10:00-18:00", "Mo-Sa 09:00-12:00"];
const PLACES: PlanPlace[] = Array.from({ length: 24 }, (_, i) => {
  const free = i % 3 === 0;
  return {
    slug: `lieu-${i}`,
    name: `Lieu ${i}`,
    family: FAMILIES[i % FAMILIES.length]!,
    region: (["nord", "nord_ouest", "est", "centre"] as const)[i % 4]!,
    lat: -20 - Math.floor(i / 6) * 0.08 - rand() * 0.02,
    lng: 57.5 + (i % 6) * 0.05 + rand() * 0.02,
    tags: i === 5 ? ["coucher_soleil"] : i % 7 === 0 ? ["pluie_ok"] : [],
    priceKind: free ? "free" : i % 3 === 1 ? "paid" : null,
    priceMur: free ? null : i % 3 === 1 ? 100 + (i % 5) * 150 : null,
    durationMin: i % 2 === 0 ? 45 + (i % 4) * 30 : null,
    durationMax: null,
    openingHours: HOURS[i % HOURS.length]!,
    interest: i % 4 === 0 ? null : 1 + (i % 5),
    rarity: i % 6 === 0 ? "incontournable" : i % 6 === 1 ? "insolite" : null,
    isSecret: i % 8 === 1,
    rainOk: null,
  };
});
const POINTS = new Map<string, { lat: number; lng: number }>([[START, { lat: -20.01, lng: 57.58 }], ...PLACES.map((p) => [p.slug, p] as const)]);
// 1 degré ≈ 105 km, 35 km/h de moyenne, routes 30 % plus longues que la ligne droite.
const travel: TravelLookup = (from, to) => {
  const a = POINTS.get(from);
  const b = POINTS.get(to);
  if (!a || !b) return null;
  const km = Math.hypot(a.lat - b.lat, a.lng - b.lng) * 105 * 1.3;
  return Math.round((km / 35) * 60);
};

const BASE: Answers = {
  startDate: "2026-12-21",
  endDate: "2026-12-27",
  startSlug: START,
  budgetPerPersonMur: 750, // environ 15 €
  adults: 2,
  children: 2,
  likes: ["plages_lagon", "culture_patrimoine"],
  pace: "normal",
  maxDriveMin: 150,
  avoidFamilies: [],
  avoidSlugs: [],
  mustSlugs: [],
  style: 0,
  holidays: ["2026-12-25"],
  visitedSlugs: [],
};

const bySlug = new Map(PLACES.map((p) => [p.slug, p]));

function checkDay(day: DayPlan, answers: Answers) {
  for (const stop of day.stops) {
    const place = bySlug.get(stop.slug)!;
    // Jamais d'étape fermée.
    expect(openStateDuring(place.openingHours, day.date, stop.arrive, stop.leave, answers.holidays), `${stop.slug} le ${day.date}`).not.toBe("closed");
    expect(stop.flags).not.toContain("ferme");
    // Un prix ou des horaires inconnus sont signalés, pas devinés.
    if (place.openingHours === null) expect(stop.flags).toContain("horaires_inconnus");
    if (place.priceKind !== "free" && place.priceMur === null) expect(stop.flags).toContain("prix_inconnu");
    if (place.durationMin === null) expect(stop.flags).toContain("duree_par_defaut");
  }
  // Budget tenu, conduite sous le plafond, fin de journée respectée.
  if (answers.budgetPerPersonMur != null) expect(day.totals.costPerPersonMur).toBeLessThanOrEqual(answers.budgetPerPersonMur);
  expect(day.totals.driveMin).toBeLessThanOrEqual(answers.maxDriveMin);
  expect(day.totals.endAt).toBeLessThanOrEqual(DAY_END);
  // Les heures s'enchaînent.
  day.stops.forEach((s, i) => {
    expect(s.leave).toBeGreaterThan(s.arrive);
    if (i > 0) expect(s.arrive).toBeGreaterThanOrEqual(day.stops[i - 1]!.leave);
  });
}

describe("programme du séjour", () => {
  it.each(VARIANTS)("variante %s : toutes les contraintes tiennent, chaque jour", (variant) => {
    const days = generateTrip(PLACES, travel, BASE, variant, 1);
    expect(days).toHaveLength(7);
    expect(days.filter((d) => d.stops.length > 0).length).toBeGreaterThanOrEqual(4);
    days.forEach((d) => checkDay(d, BASE));
  });

  it("aucun lieu en double sur le séjour", () => {
    for (const variant of VARIANTS) {
      const slugs = generateTrip(PLACES, travel, BASE, variant, 1).flatMap((d) => d.stops.map((s) => s.slug));
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("même graine, même programme ; les trois variantes diffèrent", () => {
    expect(generateTrip(PLACES, travel, BASE, "equilibre", 7)).toEqual(generateTrip(PLACES, travel, BASE, "equilibre", 7));
    const [eco, , explo] = VARIANTS.map((v) => JSON.stringify(generateTrip(PLACES, travel, BASE, v, 7).map((d) => d.stops.map((s) => s.slug))));
    expect(eco).not.toBe(explo);
  });

  it("la variante Économique coûte moins que la variante Explorateur", () => {
    const cost = (v: (typeof VARIANTS)[number]) => generateTrip(PLACES, travel, BASE, v, 1).reduce((sum, d) => sum + d.totals.costPerPersonMur, 0);
    expect(cost("economique")).toBeLessThanOrEqual(cost("explorateur"));
  });

  it("chaque jour compte une étape gratuite quand il y en a une faisable", () => {
    const days = generateTrip(PLACES, travel, BASE, "equilibre", 1).filter((d) => d.stops.length >= 2);
    const withFree = days.filter((d) => d.stops.some((s) => bySlug.get(s.slug)!.priceKind === "free"));
    expect(withFree.length).toBeGreaterThanOrEqual(Math.ceil(days.length / 2));
  });

  it("respecte les exclusions et le férié", () => {
    const answers = { ...BASE, avoidFamilies: ["manger" as const], avoidSlugs: ["lieu-0"] };
    const days = generateTrip(PLACES, travel, answers, "equilibre", 1);
    const slugs = days.flatMap((d) => d.stops.map((s) => s.slug));
    expect(slugs).not.toContain("lieu-0");
    expect(slugs.some((s) => bySlug.get(s)!.family === "manger")).toBe(false);
    // Le 25 décembre, aucun lieu « PH off ».
    const noel = days.find((d) => d.date === "2026-12-25")!;
    expect(noel.stops.some((s) => bySlug.get(s.slug)!.openingHours?.includes("PH off"))).toBe(false);
  });

  it("propriétés : 60 tirages de réponses aléatoires, aucune contrainte violée", () => {
    const r = seededRandom(2026);
    for (let n = 0; n < 60; n++) {
      const answers: Answers = {
        ...BASE,
        endDate: `2026-12-${22 + Math.floor(r() * 5)}`,
        budgetPerPersonMur: r() < 0.2 ? null : Math.round(r() * 1500),
        pace: (["calme", "normal", "intense"] as const)[Math.floor(r() * 3)]!,
        maxDriveMin: 40 + Math.round(r() * 160),
        style: ([-1, 0, 1] as const)[Math.floor(r() * 3)]!,
        likes: FAMILIES.filter(() => r() < 0.3),
        avoidFamilies: FAMILIES.filter(() => r() < 0.1),
      };
      const variant = VARIANTS[n % 3]!;
      const days = generateTrip(PLACES, travel, answers, variant, n);
      days.forEach((d) => checkDay(d, answers));
      const slugs = days.flatMap((d) => d.stops.map((s) => s.slug));
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("génère trois programmes en bien moins de 5 secondes", () => {
    const start = performance.now();
    VARIANTS.forEach((v) => generateTrip(PLACES, travel, { ...BASE, endDate: "2027-01-07" }, v, 1));
    expect(performance.now() - start).toBeLessThan(5000);
  });
});

describe("modifier une journée", () => {
  const day = generateTrip(PLACES, travel, BASE, "equilibre", 1).find((d) => d.stops.length >= 3)!;

  it("« Optimiser » ne déplace jamais une étape verrouillée et n'allonge pas la conduite", () => {
    const r = seededRandom(9);
    for (let n = 0; n < 30; n++) {
      // On mélange la journée, on verrouille des étapes au hasard, puis on optimise.
      let shuffled = day;
      for (let k = 0; k < 4; k++) {
        shuffled = moveStop(shuffled, Math.floor(r() * shuffled.stops.length), Math.floor(r() * shuffled.stops.length), PLACES, travel, BASE);
      }
      for (const s of shuffled.stops) if (r() < 0.4) shuffled = toggleLock(shuffled, s.slug);
      const optimized = optimizeDay(shuffled, PLACES, travel, BASE);
      shuffled.stops.forEach((s, i) => {
        if (s.locked) expect(optimized.stops[i]?.slug, `étape verrouillée ${s.slug}`).toBe(s.slug);
      });
      expect(optimized.totals.driveMin).toBeLessThanOrEqual(shuffled.totals.driveMin);
      expect(optimized.stops.map((s) => s.slug).sort()).toEqual(shuffled.stops.map((s) => s.slug).sort());
    }
  });

  it("supprimer et ajouter une étape recalcule les heures", () => {
    const first = day.stops[0]!.slug;
    const without = removeStop(day, first, PLACES, travel, BASE);
    expect(without.stops.map((s) => s.slug)).not.toContain(first);
    expect(without.stops).toHaveLength(day.stops.length - 1);
    const back = addStop(without, first, PLACES, travel, BASE);
    expect(back.stops.map((s) => s.slug)).toContain(first);
    expect(addStop(back, first, PLACES, travel, BASE)).toBe(back);
  });

  it("une étape déplacée sur un créneau fermé est signalée, pas cachée", () => {
    // lieu-4 n'ouvre que le matin (Mo-Sa 09:00-12:00) : placé en fin de journée, il doit être signalé fermé.
    let d = addStop({ ...day, stops: [] }, "lieu-1", PLACES, travel, BASE);
    d = addStop(d, "lieu-6", PLACES, travel, BASE);
    d = addStop(d, "lieu-3", PLACES, travel, BASE);
    const order = [...d.stops.map((s) => s.slug), "lieu-4"];
    let forced = d;
    forced = addStop(forced, "lieu-4", PLACES, travel, BASE);
    forced = moveStop(forced, forced.stops.findIndex((s) => s.slug === "lieu-4"), order.length - 1, PLACES, travel, BASE);
    const last = forced.stops.at(-1)!;
    expect(last.slug).toBe("lieu-4");
    if (last.arrive >= 12 * 60) expect(last.flags).toContain("ferme");
  });

  it("« Plan B pluie » garde les étapes verrouillées et ne propose que des lieux adaptés", () => {
    const locked = toggleLock(day, day.stops[0]!.slug);
    const rainy = rainPlan(locked, PLACES, travel, BASE);
    expect(rainy.stops.map((s) => s.slug)).toContain(day.stops[0]!.slug);
    expect(rainy.stops.find((s) => s.slug === day.stops[0]!.slug)!.locked).toBe(true);
    for (const s of rainy.stops) {
      if (s.slug === day.stops[0]!.slug) continue;
      const p = bySlug.get(s.slug)!;
      expect(p.tags.includes("pluie_ok") || p.family === "culture_patrimoine", s.slug).toBe(true);
    }
    checkDay(rainy, BASE);
  });

  it("« Nouvelle journée » garde les étapes verrouillées et change le reste", () => {
    const locked = toggleLock(day, day.stops[0]!.slug);
    const fresh = regenerateDay(locked, PLACES, travel, BASE, [], 5);
    expect(fresh.stops.map((s) => s.slug)).toContain(day.stops[0]!.slug);
    expect(fresh.stops.map((s) => s.slug).join()).not.toBe(day.stops.map((s) => s.slug).join());
    checkDay(fresh, BASE);
  });
});
