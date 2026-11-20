import { describe, expect, it } from "vitest";
import { fill } from "@/i18n";
import { directionsUrl, formatDateFr, formatDuration, formatPriceMur } from "@/lib/places/format";

describe("lien « Y aller »", () => {
  it("utilise le format Google Maps URLs avec les coordonnées de la fiche", () => {
    expect(directionsUrl({ lat: -20.01, lng: 57.58 })).toBe("https://www.google.com/maps/dir/?api=1&destination=-20.01%2C57.58");
  });
  it("ajoute l'identifiant de lieu Google quand il existe", () => {
    expect(directionsUrl({ lat: -20.01, lng: 57.58, google_place_id: "abc" })).toContain("destination_place_id=abc");
  });
});

describe("durée", () => {
  it.each([
    [null, null, null],
    [45, null, "45 min"],
    [60, 60, "1 h"],
    [90, null, "1 h 30"],
    [60, 125, "1 h à 2 h 05"],
    [null, 30, "30 min"],
  ])("%s–%s → %s", (min, max, expected) => expect(formatDuration(min, max)).toBe(expected));
});

describe("prix en roupies", () => {
  const base = { price_kind: null, price_visitor_mur_min: null, price_visitor_mur_max: null };
  it("inconnu quand rien n'est renseigné", () => expect(formatPriceMur(base)).toEqual({ kind: "unknown" }));
  it("gratuit", () => expect(formatPriceMur({ ...base, price_kind: "free" })).toEqual({ kind: "free" }));
  it("montant unique", () =>
    expect(formatPriceMur({ ...base, price_kind: "paid", price_visitor_mur_min: 300 })).toEqual({ kind: "amount", text: "300 Rs" }));
  it("fourchette", () =>
    expect(formatPriceMur({ price_kind: "paid", price_visitor_mur_min: 150, price_visitor_mur_max: 300 })).toEqual({
      kind: "amount",
      text: "150 à 300 Rs",
    }));
  it("payant sans montant connu reste inconnu", () =>
    expect(formatPriceMur({ ...base, price_kind: "paid" })).toEqual({ kind: "unknown" }));
  it("variable sans montant", () => expect(formatPriceMur({ ...base, price_kind: "variable" })).toEqual({ kind: "variable" }));
});

describe("textes", () => {
  it("date en français", () => expect(formatDateFr("2026-11-20")).toBe("20 novembre 2026"));
  it("remplace les variables", () => expect(fill("{count} lieux", { count: 3 })).toBe("3 lieux"));
});
