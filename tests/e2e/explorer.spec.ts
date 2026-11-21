import { expect, test } from "@playwright/test";
import { mockMap } from "./fixtures";

test.beforeEach(async ({ page }) => mockMap(page));

test("de la carte à la fiche puis à la navigation, en moins de 30 secondes", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await page.getByRole("link", { name: "Ouvrir la carte" }).click();
  await expect(page.getByText("3 lieux")).toBeVisible();

  // Le marqueur du lieu sur la carte ouvre l'aperçu, puis la fiche.
  await page.getByRole("button", { name: "Plage de test" }).click();
  await page.getByRole("link", { name: "Voir la fiche" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Plage de test" })).toBeVisible();
  await expect(page.getByText("1 h à 1 h 30")).toBeVisible();
  await expect(page.getByRole("link", { name: "Source fictive" })).toBeVisible();
  await expect(page.getByText("Fiche vérifiée le 20 novembre 2026")).toBeVisible();

  const go = page.getByRole("link", { name: "Y aller" });
  expect(await go.getAttribute("href")).toBe("https://www.google.com/maps/dir/?api=1&destination=-20.01%2C57.58");
  expect(Date.now() - start).toBeLessThan(30_000);
});

test("une fiche non vérifiée est visible, avec un avertissement clair", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByRole("link", { name: /Brouillon de test/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Brouillon de test" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fiche pas encore vérifiée sur place" })).toBeVisible();
  // Récit Île secrète et lien vers le site officiel.
  await expect(page.getByText("Récit fictif pour les tests.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Site officiel" })).toHaveAttribute("href", "https://example.org/officiel");
});

test("une fiche vérifiée n'affiche pas l'avertissement", async ({ page }) => {
  await page.goto("/lieu/lieu-de-test-plage");
  await expect(page.getByRole("heading", { level: 1, name: "Plage de test" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fiche pas encore vérifiée sur place" })).toHaveCount(0);
});

test("recherche et filtres réduisent la liste", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByRole("searchbox", { name: "Chercher un lieu" }).fill("musee");
  await expect(page.getByText("1 lieu", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Musée de test/ })).toBeVisible();

  await page.getByRole("searchbox", { name: "Chercher un lieu" }).fill("");
  await page.getByRole("button", { name: "Gratuit" }).click();
  await expect(page.getByRole("link", { name: /Plage de test/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Musée de test/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Île secrète" }).click();
  await expect(page.getByRole("link", { name: /Brouillon de test/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Plage de test/ })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Chercher un lieu" }).fill("zzz");
  await expect(page.getByRole("heading", { name: "Aucun lieu ne correspond" })).toBeVisible();
});

test("un champ inconnu s'affiche « Non renseigné »", async ({ page }) => {
  await page.goto("/lieu/lieu-de-test-musee");
  await expect(page.getByRole("heading", { level: 1, name: "Musée de test" })).toBeVisible();
  // Trajet, durée, prix, difficulté et horaires sont inconnus dans cette fiche de test.
  await expect(page.getByText("Non renseigné")).toHaveCount(5);
});

test("une fiche inexistante le dit clairement", async ({ page }) => {
  const response = await page.goto("/lieu/nexiste-pas");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Fiche introuvable" })).toBeVisible();
});

test("ajouter puis retirer un favori, conservé après rechargement", async ({ page }) => {
  await page.goto("/lieu/lieu-de-test-plage");
  await page.getByRole("button", { name: "Ajouter aux favoris" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Retirer des favoris" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("link", { name: /Plage de test/ })).toBeVisible();

  await page.getByRole("link", { name: /Plage de test/ }).click();
  await page.getByRole("button", { name: "Retirer des favoris" }).click();
  await page.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("heading", { name: "Pas encore de favori" })).toBeVisible();
});

test("si le fond de carte ne charge pas, l'app le dit et la liste reste utilisable", async ({ page }) => {
  await page.unroute("https://tiles.openfreemap.org/**");
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/explorer");
  await expect(page.getByRole("heading", { name: "Carte indisponible" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Musée de test/ })).toBeVisible();
});

test("les zones tactiles font au moins 44 px", async ({ page }) => {
  for (const url of ["/lieu/lieu-de-test-plage", "/explorer"]) {
    await page.goto(url);
    await page.waitForTimeout(800);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a, button")]
        .filter((el) => el.offsetParent !== null && !el.closest(".maplibregl-ctrl"))
        .map((el) => ({ label: el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30), r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width < 44 || r.height < 44)
        .map(({ label, r }) => `${label} (${Math.round(r.width)}×${Math.round(r.height)})`),
    );
    expect(small, url).toEqual([]);
  }
});
