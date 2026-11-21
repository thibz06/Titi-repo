import { defineConfig } from "@playwright/test";

const port = 3100;

// L'app est compilée avec des fiches fictives (tests/fixtures/places), jamais avec le vrai contenu.
// Les deux « secrets » servent à vérifier qu'ils n'atterrissent jamais dans le bundle client.
export const TEST_ENV = {
  CONTENT_DIR: "tests/fixtures/places",
  SUPABASE_SERVICE_ROLE_KEY: "SECRET-service-role-de-test",
  GOOGLE_MAPS_SERVER_KEY: "SECRET-google-serveur-de-test",
};

export default defineConfig({
  testDir: "tests/e2e",
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    // Le service worker contourne l'interception réseau des tests : bloqué partout sauf dans son propre test.
    serviceWorkers: "block",
  },
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: TEST_ENV,
  },
});
