// pnpm photos:fetch — copie dans public/photos une version réduite des photos Wikimedia Commons citées
// par les fiches, pour qu'elles s'affichent de façon fiable et hors-ligne. Le crédit et la licence restent
// dans la fiche et sont affichés par l'app. Lent exprès : Wikimedia limite le débit.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = new URL("../content/places/", import.meta.url);
const out = fileURLToPath(new URL("../public/photos/", import.meta.url));
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const COMMONS = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+\.(jpe?g|png))$/i;

let done = 0;
let failed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const path = new URL(file, dir);
  const before = JSON.parse(readFileSync(path, "utf8"));
  const wanted = [];
  before.media.forEach((m, i) => {
    const match = COMMONS.exec(m.external_url ?? "");
    if (m.kind !== "photo" || !match) return;
    const ext = match[4].toLowerCase() === "png" ? "png" : "jpg";
    const name = `${before.slug}-${i + 1}.${ext}`;
    if (m.storage_path === `/photos/${name}` && existsSync(out + name)) return;
    wanted.push({ i, name, match, width: m.is_cover ? 960 : 500 });
  });
  const saved = new Map();
  for (const { i, name, match, width } of wanted) {
    const [, base, hash, original] = match;
    // Miniature à largeur standard ; si l'original est plus petit, on prend l'original.
    const widths = [...new Set([width, 500, 330])];
    for (const url of [...widths.map((w) => `${base}/thumb/${hash}/${original}/${w}px-${original}`), `${base}/${hash}/${original}`]) {
      await sleep(4000);
      try {
        execFileSync("curl", ["-sS", "-f", "-m", "60", "-A", "content-research-bot/1.0", "-o", out + name, url], { stdio: "pipe" });
        if (statSync(out + name).size > 5000 && statSync(out + name).size < 900_000) {
          saved.set(i, `/photos/${name}`);
          break;
        }
      } catch {
        // on essaie l'URL suivante
      }
    }
    if (saved.has(i)) done += 1;
    else failed += 1;
  }
  if (saved.size === 0) continue;
  // Relire juste avant d'écrire : d'autres outils peuvent modifier la fiche.
  const now = JSON.parse(readFileSync(path, "utf8"));
  now.media.forEach((m, i) => {
    if (saved.has(i) && m.external_url === before.media[i]?.external_url) m.storage_path = saved.get(i);
  });
  writeFileSync(path, JSON.stringify(now, null, 2) + "\n");
  console.log(`${before.slug} : ${saved.size} photo(s)`);
}
console.log(`Terminé : ${done} photo(s) copiée(s), ${failed} échec(s).`);
