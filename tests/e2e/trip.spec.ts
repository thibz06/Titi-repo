import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Taux de change simulé : aucun appel réseau réel dans les tests.
  await page.route("**/api/rate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ murPerEur: 50, date: "2026-11-20", source: "Source de test", sourceUrl: "https://example.org" }),
    }),
  );
});

test("du questionnaire au programme, puis modification d'une journée", async ({ page }) => {
  await page.goto("/voyage");
  await page.getByRole("button", { name: "Commencer" }).click();

  // Six questions, toutes passables grâce aux valeurs par défaut.
  await expect(page.getByRole("heading", { name: "Quelles sont tes dates ?" })).toBeVisible();
  await page.getByLabel("Départ").fill("2026-12-23");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByRole("heading", { name: "Dans quelle zone loges-tu ?" })).toBeVisible();
  await page.getByRole("button", { name: "Passer" }).click();
  await page.getByRole("button", { name: "Passer" }).click();
  await expect(page.getByRole("heading", { name: /Quel budget/ })).toBeVisible();
  await expect(page.getByText("≈ 750 Rs")).toBeVisible();
  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByRole("heading", { name: "Comment te déplaces-tu ?" })).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByRole("heading", { name: /fait envie/ })).toBeVisible();
  await page.getByRole("button", { name: "Voir mon programme" }).click();

  // Trois variantes, trois jours.
  await expect(page.getByRole("button", { name: "Économique" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explorateur" })).toBeVisible();
  await expect(page.getByText(/3 jours · \d+ étapes/)).toBeVisible();
  await expect(page.getByText("Ce programme est une proposition modifiable. L'app ne réserve rien.")).toBeVisible();
  await expect(page.getByText(/Temps de route : estimation matrice de test/)).toBeVisible();

  // Ouvrir le premier jour et le modifier.
  await page.getByRole("button", { name: /Jour 1/ }).click();
  await expect(page.getByText(/Départ du logement à 9 h 00/)).toBeVisible();
  const stops = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: /^Retirer / }) });
  const before = await stops.count();
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: /^Retirer / }).first().click();
  await expect(stops).toHaveCount(before - 1);

  await page.getByLabel("Ajouter une étape").selectOption({ index: 1 });
  await expect(stops).toHaveCount(before);
  await page.getByRole("button", { name: /^Verrouiller / }).first().click();
  await expect(page.getByText(/Verrouillée/)).toBeVisible();
  await page.getByRole("button", { name: "Optimiser ma journée" }).click();
  await expect(page.getByText(/Verrouillée/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir l'itinéraire dans Google Maps" })).toHaveAttribute("href", /google\.com\/maps\/dir/);

  // Le programme est gardé sur l'appareil.
  await page.reload();
  await expect(page.getByRole("button", { name: "Équilibré" })).toBeVisible();
});

test("sans taux de change, l'app le dit au lieu d'inventer une conversion", async ({ page }) => {
  await page.unroute("**/api/rate");
  await page.route("**/api/rate", (route) => route.fulfill({ status: 502, contentType: "application/json", body: '{"error":"indisponible"}' }));
  await page.goto("/voyage");
  await page.getByRole("button", { name: "Commencer" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByText(/Le taux de change est indisponible/)).toBeVisible();
});
