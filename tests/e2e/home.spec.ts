import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

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

test.describe("hors-ligne", () => {
  test.use({ serviceWorkers: "allow" });

  test("après une première visite, une fiche et les favoris restent consultables sans réseau", async ({ page, context }) => {
    await page.goto("/lieu/lieu-de-test-plage");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.getByRole("button", { name: "Ajouter aux favoris" }).click();
    await page.reload(); // la page est maintenant servie et mise en cache par le service worker
    await expect(page.getByRole("heading", { level: 1, name: "Plage de test" })).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Plage de test" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retirer des favoris" })).toBeVisible();
  });
});
