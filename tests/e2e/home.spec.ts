import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { mockSupabase } from "./fixtures";

test.beforeEach(async ({ page }) => mockSupabase(page));

test("l'accueil s'affiche sur mobile sans défilement horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Mauritius Quest" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("le manifeste PWA est servi avec ses icônes", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as { icons: { src: string }[] };
  for (const icon of manifest.icons) {
    expect(existsSync(`public${icon.src}`), icon.src).toBe(true);
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});

test.describe("service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("il s'installe et prend le contrôle", async ({ page }) => {
  await page.goto("/");
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/$/);
});
});
