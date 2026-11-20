import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { TEST_ENV } from "../../playwright.config";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("aucune clé secrète dans le bundle client", () => {
  const clientFiles = files(".next/static");
  expect(clientFiles.length).toBeGreaterThan(0);
  const forbidden = [
    TEST_ENV.SUPABASE_SERVICE_ROLE_KEY,
    TEST_ENV.GOOGLE_MAPS_SERVER_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
    "GOOGLE_MAPS_SERVER_KEY",
    "ORS_API_KEY",
  ];
  const leaks: string[] = [];
  for (const file of clientFiles) {
    const content = readFileSync(file, "utf8");
    for (const needle of forbidden) if (content.includes(needle)) leaks.push(`${needle} dans ${file}`);
  }
  expect(leaks).toEqual([]);
  // Contrôle du contrôle : la clé anonyme, elle, doit bien être dans le bundle.
  expect(clientFiles.some((f) => readFileSync(f, "utf8").includes(TEST_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY))).toBe(true);
});
