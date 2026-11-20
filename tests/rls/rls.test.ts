import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type Actor, type TestDb } from "./harness";

let t: TestDb;
let alice: Actor & { userId: string };
let bob: Actor & { userId: string };
let editor: Actor & { userId: string };
const anon: Actor = { role: "anon" };
let regionId: string;
let publishedId: string;
let draftId: string;

const PLACE_COLS = `(slug, name, family, region_id, lat, lng)`;

beforeAll(async () => {
  t = await createTestDb();
  alice = { role: "authenticated", userId: await t.createUser() };
  bob = { role: "authenticated", userId: await t.createUser() };
  editor = { role: "authenticated", userId: await t.createUser("editor") };
  regionId = (await t.admin<{ id: string }>(`select id from public.regions where code = 'nord'`))[0]!.id;

  draftId = (
    await t.admin<{ id: string }>(
      `insert into public.places ${PLACE_COLS} values ('brouillon', 'Brouillon', 'plages_lagon', $1, -20.01, 57.58) returning id`,
      [regionId],
    )
  )[0]!.id;
  publishedId = (
    await t.admin<{ id: string }>(
      `insert into public.places ${PLACE_COLS} values ('publie', 'Publié', 'plages_lagon', $1, -20.02, 57.59) returning id`,
      [regionId],
    )
  )[0]!.id;
  for (const id of [draftId, publishedId]) {
    await t.admin(
      `insert into public.place_sources (place_id, field, url, accessed_at) values ($1, 'description_md', 'https://example.org/source', '2026-11-20')`,
      [id],
    );
  }
  await t.admin(`update public.places set status = 'published', verified_at = '2026-11-20' where id = $1`, [publishedId]);
}, 60_000);

describe("toutes les tables ont la RLS activée", () => {
  it("aucune table publique sans RLS", async () => {
    const rows = await t.admin<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
         and c.relname not in ('spatial_ref_sys')`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });
});

describe("anonyme", () => {
  it("lit les fiches publiées, pas les brouillons", async () => {
    const rows = await t.as<{ slug: string }>(anon, `select slug from public.places`);
    expect(rows.map((r) => r.slug)).toEqual(["publie"]);
  });

  it("ne lit que les sources des fiches publiées", async () => {
    const rows = await t.as<{ place_id: string }>(anon, `select place_id from public.place_sources`);
    expect(rows.map((r) => r.place_id)).toEqual([publishedId]);
  });

  it("ne peut rien écrire dans places", async () => {
    await expect(
      t.as(anon, `insert into public.places ${PLACE_COLS} values ('pirate', 'Pirate', 'manger', $1, -20.1, 57.5)`, [regionId]),
    ).rejects.toThrow(/row-level security/);
    expect(await t.as(anon, `update public.places set name = 'Piraté' returning id`)).toEqual([]);
    expect(await t.as(anon, `delete from public.places returning id`)).toEqual([]);
    const [row] = await t.admin<{ name: string }>(`select name from public.places where id = $1`, [publishedId]);
    expect(row?.name).toBe("Publié");
  });

  it("lit les régions mais ne voit aucune donnée personnelle", async () => {
    expect(await t.as(anon, `select code from public.regions`)).toHaveLength(8);
    await t.as(alice, `insert into public.favorites (user_id, place_id) values ($1, $2)`, [alice.userId, publishedId]);
    expect(await t.as(anon, `select * from public.favorites`)).toEqual([]);
    expect(await t.as(anon, `select * from public.profiles`)).toEqual([]);
  });
});

describe("utilisateur", () => {
  it("a un profil créé automatiquement, avec le rôle user", async () => {
    const rows = await t.as<{ id: string; role: string }>(alice, `select id, role from public.profiles`);
    expect(rows).toEqual([{ id: alice.userId, role: "user" }]);
  });

  it("ne peut pas se donner le rôle editor", async () => {
    await expect(t.as(alice, `update public.profiles set role = 'editor' where id = $1`, [alice.userId])).rejects.toThrow(
      /permission denied/,
    );
    await t.as(alice, `update public.profiles set display_name = 'Alice' where id = $1`, [alice.userId]);
    const [row] = await t.admin<{ role: string; display_name: string }>(
      `select role, display_name from public.profiles where id = $1`,
      [alice.userId],
    );
    expect(row).toEqual({ role: "user", display_name: "Alice" });
  });

  it("ne peut pas écrire dans places ni lire les brouillons", async () => {
    await expect(
      t.as(alice, `insert into public.places ${PLACE_COLS} values ('x', 'X', 'manger', $1, -20.1, 57.5)`, [regionId]),
    ).rejects.toThrow(/row-level security/);
    expect(await t.as(alice, `update public.places set name = 'X' returning id`)).toEqual([]);
    expect(await t.as(alice, `select id from public.places where id = $1`, [draftId])).toEqual([]);
  });

  it("gère ses favoris, invisibles pour les autres", async () => {
    expect(await t.as(alice, `select place_id from public.favorites`)).toEqual([{ place_id: publishedId }]);
    expect(await t.as(bob, `select place_id from public.favorites`)).toEqual([]);
    expect(await t.as(bob, `delete from public.favorites returning place_id`)).toEqual([]);
    await expect(
      t.as(bob, `insert into public.favorites (user_id, place_id) values ($1, $2)`, [alice.userId, publishedId]),
    ).rejects.toThrow(/row-level security/);
  });

  it("ne peut pas se créditer d'XP ni de badge", async () => {
    await expect(
      t.as(alice, `insert into public.xp_events (user_id, kind, xp) values ($1, 'triche', 9999)`, [alice.userId]),
    ).rejects.toThrow(/row-level security/);
  });

  it("garde ses voyages privés, étapes comprises", async () => {
    const [trip] = await t.as<{ id: string }>(alice, `insert into public.trips (user_id) values ($1) returning id`, [
      alice.userId,
    ]);
    const [day] = await t.as<{ id: string }>(
      alice,
      `insert into public.trip_days (trip_id, day, variant) values ($1, '2026-12-22', 'equilibre') returning id`,
      [trip!.id],
    );
    await t.as(alice, `insert into public.trip_stops (trip_day_id, place_id, position) values ($1, $2, 1)`, [
      day!.id,
      publishedId,
    ]);
    expect(await t.as(bob, `select id from public.trips`)).toEqual([]);
    expect(await t.as(bob, `select id from public.trip_days`)).toEqual([]);
    expect(await t.as(bob, `select id from public.trip_stops`)).toEqual([]);
    await expect(
      t.as(bob, `insert into public.trip_stops (trip_day_id, place_id, position) values ($1, $2, 2)`, [day!.id, publishedId]),
    ).rejects.toThrow(/row-level security/);
  });

  it("signale une erreur, relit la sienne, pas celles des autres", async () => {
    await t.as(alice, `insert into public.reports (user_id, place_id, message) values ($1, $2, 'Horaire faux')`, [
      alice.userId,
      publishedId,
    ]);
    expect(await t.as(alice, `select message from public.reports`)).toHaveLength(1);
    expect(await t.as(bob, `select message from public.reports`)).toEqual([]);
  });
});

describe("éditeur", () => {
  it("lit les brouillons et modifie une fiche", async () => {
    const rows = await t.as<{ slug: string }>(editor, `select slug from public.places order by slug`);
    expect(rows.map((r) => r.slug)).toEqual(["brouillon", "publie"]);
    const updated = await t.as(editor, `update public.places set pitch = 'Nouveau' where id = $1 returning id`, [draftId]);
    expect(updated).toHaveLength(1);
  });

  it("voit tous les signalements", async () => {
    expect(await t.as(editor, `select id from public.reports`)).toHaveLength(1);
  });

  it("ne lit pas les favoris des autres", async () => {
    expect(await t.as(editor, `select * from public.favorites`)).toEqual([]);
  });
});

describe("garde-fous de publication", () => {
  it("refuse de publier sans date de vérification", async () => {
    await expect(
      t.as(editor, `update public.places set status = 'published' where id = $1`, [draftId]),
    ).rejects.toThrow(/date de vérification/);
  });

  it("refuse de publier sans source", async () => {
    const [p] = await t.as<{ id: string }>(
      editor,
      `insert into public.places ${PLACE_COLS} values ('sans-source', 'Sans source', 'manger', $1, -20.1, 57.5) returning id`,
      [regionId],
    );
    await expect(
      t.as(editor, `update public.places set status = 'published', verified_at = '2026-11-20' where id = $1`, [p!.id]),
    ).rejects.toThrow(/aucune source/);
  });

  it("refuse de publier une fiche Île secrète dont l'accès légal n'est pas vérifié", async () => {
    await t.as(editor, `insert into public.secret_stories (place_id, story_md) values ($1, 'Récit')`, [draftId]);
    await expect(
      t.as(editor, `update public.places set status = 'published', verified_at = '2026-11-20' where id = $1`, [draftId]),
    ).rejects.toThrow(/accès légal/);
    await t.as(editor, `update public.secret_stories set legal_access_checked = true where place_id = $1`, [draftId]);
    const ok = await t.as(
      editor,
      `update public.places set status = 'published', verified_at = '2026-11-20' where id = $1 returning id`,
      [draftId],
    );
    expect(ok).toHaveLength(1);
  });

  it("refuse de retirer la dernière source d'une fiche publiée", async () => {
    await expect(t.as(editor, `delete from public.place_sources where place_id = $1`, [publishedId])).rejects.toThrow(
      /dernière source/,
    );
  });

  it("refuse des coordonnées hors de l'île", async () => {
    await expect(
      t.as(editor, `insert into public.places ${PLACE_COLS} values ('paris', 'Paris', 'manger', $1, 48.85, 2.35)`, [regionId]),
    ).rejects.toThrow(/check constraint/);
  });
});
