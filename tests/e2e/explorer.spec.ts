import { expect, test } from "@playwright/test";
import { mockSupabase, TEST_PLACES } from "./fixtures";

test.beforeEach(async ({ page }) => mockSupabase(page));

test("trouver un lieu, lire sa fiche et lancer la navigation", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await page.getByRole("link", { name: "Ouvrir la carte" }).click();
  await expect(page.getByText("2 lieux")).toBeVisible();

  await page.getByRole("link", { name: /Plage de test/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Plage de test" })).toBeVisible();
  await expect(page.getByText("1 h à 1 h 30")).toBeVisible();
  await expect(page.getByRole("link", { name: "Source fictive" })).toBeVisible();
  await expect(page.getByText("Fiche vérifiée le 20 novembre 2026")).toBeVisible();

  const go = page.getByRole("link", { name: "Y aller" });
  await expect(go).toBeVisible();
  const href = await go.getAttribute("href");
  const place = TEST_PLACES[0]!;
  expect(href).toBe(`https://www.google.com/maps/dir/?api=1&destination=${place.lat}%2C${place.lng}`);
  expect(Date.now() - start).toBeLessThan(30_000);
});

test("un champ inconnu s'affiche « Non renseigné »", async ({ page }) => {
  await page.goto("/lieu/lieu-de-test-musee");
  await expect(page.getByRole("heading", { level: 1, name: "Musée de test" })).toBeVisible();
  // Trajet, prix, difficulté et horaires sont inconnus dans cette fiche de test.
  await expect(page.getByText("Non renseigné")).toHaveCount(4);
});

test("une fiche inexistante le dit clairement", async ({ page }) => {
  await page.goto("/lieu/nexiste-pas");
  await expect(page.getByRole("heading", { name: "Fiche introuvable" })).toBeVisible();
});

test("ajouter puis retirer un favori", async ({ page }) => {
  await page.goto("/lieu/lieu-de-test-plage");
  await page.getByRole("button", { name: "Ajouter aux favoris" }).click();
  await expect(page.getByRole("button", { name: "Retirer des favoris" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("link", { name: /Plage de test/ })).toBeVisible();

  await page.getByRole("link", { name: /Plage de test/ }).click();
  await page.getByRole("button", { name: "Retirer des favoris" }).click();
  await page.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("heading", { name: "Pas encore de favori" })).toBeVisible();
});

test("sans clé Google Maps, l'app le dit et la liste reste utilisable", async ({ page }) => {
  await page.goto("/explorer");
  await expect(page.getByText("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")).toBeVisible();
  await expect(page.getByRole("link", { name: /Musée de test/ })).toBeVisible();
});

test("les zones tactiles font au moins 44 px", async ({ page }) => {
  await page.goto("/lieu/lieu-de-test-plage");
  await expect(page.getByRole("link", { name: "Y aller" })).toBeVisible();
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a, button")]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ label: el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ label, r }) => `${label} (${Math.round(r.width)}×${Math.round(r.height)})`),
  );
  expect(small).toEqual([]);
});
