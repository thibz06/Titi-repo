import { describe, expect, it } from "vitest";
import { openStateAt, openStateDuring } from "@/lib/planner/hours";

const H = (h: number, m = 0) => h * 60 + m;
// 2026-12-22 est un mardi, 2026-12-25 un vendredi férié, 2026-12-27 un dimanche.
const HOLIDAYS = ["2026-12-25"];

describe("horaires d'ouverture", () => {
  it("inconnu quand rien n'est renseigné", () => {
    expect(openStateAt(null, "2026-12-22", H(10), HOLIDAYS)).toBe("unknown");
  });

  it("ouvert et fermé selon l'heure", () => {
    const rule = "Mo-Fr 08:30-17:00; Sa 09:00-12:00";
    expect(openStateAt(rule, "2026-12-22", H(10), HOLIDAYS)).toBe("open");
    expect(openStateAt(rule, "2026-12-22", H(8), HOLIDAYS)).toBe("closed");
    expect(openStateAt(rule, "2026-12-22", H(17, 30), HOLIDAYS)).toBe("closed");
    expect(openStateAt(rule, "2026-12-27", H(10), HOLIDAYS)).toBe("closed");
  });

  it("fermé un jour férié quand la règle dit « PH off »", () => {
    const rule = "Mo-Fr 08:30-17:00; PH off";
    expect(openStateAt(rule, "2026-12-25", H(10), HOLIDAYS)).toBe("closed");
    expect(openStateAt(rule, "2026-12-24", H(10), HOLIDAYS)).toBe("open");
  });

  it("ouvert les fériés quand la règle les inclut", () => {
    const rule = "Mo-Su,PH 08:30-17:30";
    expect(openStateAt(rule, "2026-12-25", H(10), HOLIDAYS)).toBe("open");
    expect(openStateAt(rule, "2026-12-25", H(18), HOLIDAYS)).toBe("closed");
    expect(openStateAt(rule, "2026-12-27", H(9), HOLIDAYS)).toBe("open");
  });

  it("une règle illisible donne inconnu, pas une supposition", () => {
    expect(openStateAt("n'importe quoi", "2026-12-22", H(10), HOLIDAYS)).toBe("unknown");
  });

  it("une visite qui déborde sur la fermeture est refusée", () => {
    const rule = "Mo-Su 09:00-17:00";
    expect(openStateDuring(rule, "2026-12-22", H(15), H(16, 30), HOLIDAYS)).toBe("open");
    expect(openStateDuring(rule, "2026-12-22", H(16), H(17, 30), HOLIDAYS)).toBe("closed");
  });
});
