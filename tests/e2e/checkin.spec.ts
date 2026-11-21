import { expect, test } from "@playwright/test";
import { mockMap } from "./fixtures";

// La plage de test est en (-20.01, 57.58) ; rayon de check-in d'une plage : 600 m.
const ON_SITE = { latitude: -20.0102, longitude: 57.5801, accuracy: 10 };
const FAR_AWAY = { latitude: -20.3, longitude: 57.4, accuracy: 10 };

test.beforeEach(async ({ page }) => mockMap(page));

test.describe("avec la position autorisée", () => {
  test.use({ permissions: ["geolocation"], geolocation: ON_SITE });

  test("dans le rayon : l'XP attendu, une seule fois", async ({ page }) => {
    await page.goto("/lieu/lieu-de-test-plage");
    await page.getByRole("button", { name: "J'y suis" }).click();
    await expect(page.getByText("+10 XP")).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();

    // Le bouton est maintenant « Visité » et désactivé : pas de second gain possible.
    await expect(page.getByRole("button", { name: "Visité" })).toBeDisabled();
    await page.reload();
    await expect(page.getByRole("button", { name: "Visité" })).toBeDisabled();

    await page.getByRole("link", { name: "Profil" }).click();
    await expect(page.getByText("10 XP", { exact: true })).toBeVisible();
    await expect(page.getByText(/validé par GPS/)).toBeVisible();
  });

  test("hors rayon : refus, puis repli manuel avec le même XP", async ({ page, context }) => {
    await context.setGeolocation(FAR_AWAY);
    await page.goto("/lieu/lieu-de-test-plage");
    await page.getByRole("button", { name: "J'y suis" }).click();
    await expect(page.getByText(/Tu es à .* du lieu/)).toBeVisible();
    await expect(page.getByText("+10 XP")).toHaveCount(0);

    await page.getByRole("button", { name: "Valider à la main" }).click();
    await expect(page.getByText("+10 XP")).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("link", { name: "Profil" }).click();
    await expect(page.getByText(/validé à la main/)).toBeVisible();
  });

  test("« Autour de moi » trie la liste par distance", async ({ page }) => {
    await page.goto("/explorer");
    await page.getByRole("button", { name: "Autour de moi" }).click();
    await expect(page.getByText("Trié par distance")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "à vol d'oiseau" }).first()).toContainText("Plage de test");
  });
});

test.describe("position refusée", () => {
  test.use({ permissions: [] });

  test("l'app l'explique et propose la validation à la main", async ({ page }) => {
    await page.goto("/lieu/lieu-de-test-plage");
    await page.getByRole("button", { name: "J'y suis" }).click();
    await expect(page.getByText("La position est refusée pour ce site. Tu peux valider à la main.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Valider à la main" })).toBeVisible();
  });
});

test.describe("hors-ligne", () => {
  test.use({ serviceWorkers: "allow", permissions: ["geolocation"], geolocation: ON_SITE });

  test("un check-in fait sans réseau est conservé", async ({ page, context }) => {
    await page.goto("/lieu/lieu-de-test-plage");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("button", { name: "J'y suis" }).click();
    await expect(page.getByText("+10 XP")).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();

    await context.setOffline(false);
    await page.reload();
    await expect(page.getByRole("button", { name: "Visité" })).toBeDisabled();
  });
});
