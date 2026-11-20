import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lintDraft, placeDraftSchema } from "@/content/schema";

const dir = new URL("../../content/places/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

describe("brouillons de fiches", () => {
  it.each(files)("%s respecte le schéma et les règles de sources", (file) => {
    const raw: unknown = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
    const parsed = placeDraftSchema.safeParse(raw);
    expect(parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)).toEqual([]);
    if (!parsed.success) return;
    expect(parsed.data.slug).toBe(file.replace(/\.json$/, ""));
    expect(lintDraft(parsed.data)).toEqual([]);
  });

  it("les slugs sont uniques", () => {
    const slugs = files.map((f) => (JSON.parse(readFileSync(new URL(f, dir), "utf8")) as { slug: string }).slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
