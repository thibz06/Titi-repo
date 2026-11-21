import type { Page } from "@playwright/test";

/** Remplace le fond de carte OpenFreeMap par un style vide : pas d'appel réseau dans les tests. */
export async function mockMap(page: Page) {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: 8,
        glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        sources: {},
        layers: [{ id: "fond", type: "background", paint: { "background-color": "#9FD9DB" } }],
      }),
    }),
  );
}
