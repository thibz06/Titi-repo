import type { Page } from "@playwright/test";

// Données de test, volontairement fictives : elles n'existent que dans ces tests.
export const TEST_PLACES = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "lieu-de-test-plage",
    name: "Plage de test",
    family: "plages_lagon",
    tags: ["gratuit", "famille"],
    locality: "Village test",
    lat: -20.01,
    lng: 57.58,
    pitch: "Une fiche fictive pour les tests.",
    price_kind: "free",
    rarity: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "lieu-de-test-musee",
    name: "Musée de test",
    family: "culture_patrimoine",
    tags: [],
    locality: null,
    lat: -20.16,
    lng: 57.5,
    pitch: null,
    price_kind: "paid",
    rarity: null,
  },
];

const DETAIL_EXTRA = {
  google_place_id: null,
  description_md: "Description fictive.",
  why_go_md: null,
  likes: ["Un point fort fictif"],
  watchouts: [],
  tips_md: null,
  duration_min: 60,
  duration_max: 90,
  price_visitor_mur_min: null,
  price_visitor_mur_max: null,
  price_resident_mur: null,
  price_note: null,
  opening_hours: null,
  hours_note: null,
  difficulty: null,
  risk_level: null,
  risk_note: null,
  verified_at: "2026-11-20",
  regions: { code: "nord", name: "Nord" },
  place_sources: [
    { id: "s1", field: "description_md", url: "https://example.org/source", title: "Source fictive", accessed_at: "2026-11-20" },
  ],
  place_media: [],
};

const USER_ID = "99999999-9999-4999-8999-999999999999";

/** Intercepte Supabase (auth anonyme, fiches, favoris) avec un état de favoris en mémoire. */
export async function mockSupabase(page: Page) {
  const favorites = new Set<string>();
  const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });
  const user = { id: USER_ID, aud: "authenticated", role: "authenticated", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: "2026-11-20T00:00:00Z" };

  await page.route("http://supabase.test/auth/v1/**", (route) =>
    route.fulfill(
      json({
        access_token: "jeton-de-test",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "rafraichissement-de-test",
        user,
      }),
    ),
  );

  await page.route("http://supabase.test/rest/v1/places**", (route) => {
    const url = new URL(route.request().url());
    const slug = url.searchParams.get("slug")?.replace(/^eq\./, "");
    if (slug) {
      const place = TEST_PLACES.find((p) => p.slug === slug);
      return route.fulfill(json(place ? [{ ...place, ...DETAIL_EXTRA }] : []));
    }
    return route.fulfill(json(TEST_PLACES));
  });

  await page.route("http://supabase.test/rest/v1/favorites**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST") {
      const body = request.postDataJSON() as { place_id: string } | { place_id: string }[];
      for (const row of Array.isArray(body) ? body : [body]) favorites.add(row.place_id);
      return route.fulfill(json(null, 201));
    }
    if (request.method() === "DELETE") {
      const id = url.searchParams.get("place_id")?.replace(/^eq\./, "");
      if (id) favorites.delete(id);
      return route.fulfill({ status: 204 });
    }
    if (url.searchParams.get("select")?.includes("places(")) {
      return route.fulfill(
        json([...favorites].map((id) => ({ created_at: "2026-11-20T00:00:00Z", places: TEST_PLACES.find((p) => p.id === id) }))),
      );
    }
    return route.fulfill(json([...favorites].map((place_id) => ({ place_id }))));
  });
}
