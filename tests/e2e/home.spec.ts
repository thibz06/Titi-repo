import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("l'accueil s'affiche sur mobile sans défilement horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Où allons-nous ?" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("la météo est présentée comme une estimation, avec sa source", async ({ page }) => {
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        daily: {
          time: ["2026-12-22", "2026-12-23", "2026-12-24"],
          temperature_2m_max: [30.2, 29.1, null],
          precipitation_sum: [12.4, 0, null],
          precipitation_probability_max: [80, 10, null],
          wind_speed_10m_max: [22, 18, null],
        },
      }),
    }),
  );
  await page.goto("/");
  await expect(page.getByText("30 °C max · pluie 80 % (12 mm) · vent 22 km/h")).toBeVisible();
  await expect(page.getByText(/Prévision, donc estimation\. Source : Open-Meteo, calculée le/)).toBeVisible();
  // Une valeur absente n'est pas inventée.
  await expect(page.getByText(/Non renseigné °C max/)).toBeVisible();
});

test("si la météo ne répond pas, l'app le dit", async ({ page }) => {
  await page.route("https://api.open-meteo.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("La météo est indisponible pour le moment.")).toBeVisible();
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
