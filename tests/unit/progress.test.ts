import { describe, expect, it } from "vitest";
import {
  checkIn,
  completedRegions,
  distanceM,
  levelFor,
  manualCheckinsLeft,
  totalXp,
  withinRadius,
  xpForPlace,
  type Visit,
} from "@/lib/progress/rules";

const beach = { slug: "plage", family: "plages_lagon" as const, rarity: null };
const now = new Date("2026-12-22T10:00:00");

describe("XP d'un lieu", () => {
  it.each([
    ["plages_lagon", null, 10],
    ["culture_patrimoine", "incontournable", 20],
    ["culture_patrimoine", "peu_connu", 25],
    ["randos_sommets", "insolite", 45],
    ["randos_sommets", "tres_confidentiel", 60],
    ["plages_lagon", "peu_connu", 13],
  ] as const)("%s, rareté %s → %i XP", (family, rarity, xp) => expect(xpForPlace({ family, rarity })).toBe(xp));
});

describe("niveaux", () => {
  it.each([
    [0, "debutant"],
    [149, "debutant"],
    [150, "lagons"],
    [500, "aventurier"],
    [1199, "aventurier"],
    [1200, "explorateur"],
    [2500, "expert"],
    [99999, "expert"],
  ] as const)("%i XP → %s", (xp, key) => expect(levelFor(xp).key).toBe(key));

  it("donne ce qu'il reste avant le niveau suivant", () => {
    expect(levelFor(100).next).toEqual({ key: "lagons", min: 150, remaining: 50 });
    expect(levelFor(2500).next).toBeNull();
    expect(levelFor(325).progress).toBeCloseTo(0.5);
  });
});

describe("distance et rayon", () => {
  it("mesure une distance connue (un degré de latitude ≈ 111 km)", () => {
    expect(distanceM({ lat: -20, lng: 57.5 }, { lat: -21, lng: 57.5 })).toBeGreaterThan(111_000);
    expect(distanceM({ lat: -20, lng: 57.5 }, { lat: -21, lng: 57.5 })).toBeLessThan(111_400);
    expect(distanceM({ lat: -20.1, lng: 57.5 }, { lat: -20.1, lng: 57.5 })).toBe(0);
  });
  it("accepte dans le rayon, refuse au-delà", () => {
    expect(withinRadius(250, 300, null)).toBe(true);
    expect(withinRadius(350, 300, null)).toBe(false);
  });
  it("tolère l'imprécision du GPS, plafonnée à 150 m", () => {
    expect(withinRadius(350, 300, 80)).toBe(true);
    expect(withinRadius(2000, 300, 5000)).toBe(false);
  });
});

describe("check-in", () => {
  it("donne l'XP attendu une seule fois", () => {
    const first = checkIn([], beach, "gps", now, 12);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.visit.xp).toBe(10);
    expect(totalXp(first.visits)).toBe(10);
    const second = checkIn(first.visits, beach, "gps", now, 12);
    expect(second).toEqual({ ok: false, reason: "already" });
  });

  it("le repli manuel donne le même XP, trois fois par jour au plus", () => {
    let visits: Visit[] = [];
    for (const slug of ["a", "b", "c"]) {
      const r = checkIn(visits, { ...beach, slug }, "manual", now, null);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.visit.xp).toBe(10);
        visits = r.visits;
      }
    }
    expect(manualCheckinsLeft(visits, now)).toBe(0);
    expect(checkIn(visits, { ...beach, slug: "d" }, "manual", now, null)).toEqual({ ok: false, reason: "manual_limit" });
    // Le GPS reste possible, et le compteur repart le lendemain.
    expect(checkIn(visits, { ...beach, slug: "d" }, "gps", now, 10).ok).toBe(true);
    expect(manualCheckinsLeft(visits, new Date("2026-12-23T08:00:00"))).toBe(3);
  });

  it("signale une région complétée", () => {
    const one = checkIn([], { ...beach, slug: "a" }, "gps", now, 5, ["a", "b"]);
    expect(one.ok && one.regionCompleted).toBe(false);
    const two = checkIn(one.ok ? one.visits : [], { ...beach, slug: "b" }, "gps", now, 5, ["a", "b"]);
    expect(two.ok && two.regionCompleted).toBe(true);
    expect(completedRegions(two.ok ? two.visits : [], { nord: ["a", "b"], sud: ["z"], vide: [] })).toEqual(["nord"]);
  });
});
