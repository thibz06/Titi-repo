import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getMessages } from "@/i18n";
import manifest from "@/app/manifest";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
const token = (name: string): string => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!m?.[1]) throw new Error(`token ${name} introuvable`);
  return m[1];
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("contraste AA des paires de couleurs utilisées", () => {
  it.each([
    ["encre", "sable"],
    ["encre", "lagon"],
    ["passe", "sable"],
    ["or", "basalte"],
    ["sable", "basalte"],
  ])("%s sur %s ≥ 4,5", (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("textes et manifeste", () => {
  it("aucun texte français vide", () => {
    const walk = (node: unknown): string[] =>
      typeof node === "string" ? [node] : Object.values(node as Record<string, unknown>).flatMap(walk);
    for (const text of walk(getMessages("fr"))) expect(text.trim().length).toBeGreaterThan(0);
  });

  it("le manifeste est installable (nom, start_url, icônes 192 et 512, maskable)", () => {
    const m = manifest();
    expect(m.name).toBeTruthy();
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect((m.icons ?? []).some((i) => i.purpose === "maskable")).toBe(true);
  });
});
