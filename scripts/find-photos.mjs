// pnpm photos:find — cherche des photos sous licence libre pour les fiches qui en manquent, via Openverse
// (catalogue d'images Creative Commons : Flickr, Wikimedia Commons…), puis en copie une version dans
// public/photos. Auteur, licence et page d'origine sont enregistrés dans la fiche et affichés par l'app.
// Une photo n'est retenue que si son titre ou ses mots-clés nomment le lieu : dans le doute, rien.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = new URL("../content/places/", import.meta.url);
const out = fileURLToPath(new URL("../public/photos/", import.meta.url));
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = "content-research-bot/1.0";
const MAX_PER_PLACE = 3;
const LICENSES = "by,by-sa,cc0,pdm,by-nc,by-nc-sa"; // pas de « ND » : l'app recadre les photos
const STOP = new Set(
  "de du des la le les l d aux au a et ou en sur the of plage publique public beach point vue parc national marche musee museum foire randonnee observation restaurant street food ile port saint grand petit".split(" "),
);
const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const shortName = (name) => name.split(/\s+(?:et|ou)\s+|[(,:–—]/)[0] ?? name;
const LICENSE_LABEL = { by: "CC BY", "by-sa": "CC BY-SA", "by-nc": "CC BY-NC", "by-nc-sa": "CC BY-NC-SA", cc0: "CC0", pdm: "Domaine public" };

function curlJson(url, params) {
  const args = ["-sS", "-m", "40", "-A", UA, "-w", "\n%{http_code}", "-G", url];
  for (const [k, v] of Object.entries(params)) args.push("--data-urlencode", `${k}=${v}`);
  const raw = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 20e6 });
  const cut = raw.lastIndexOf("\n");
  return { status: Number(raw.slice(cut + 1)), body: raw.slice(0, cut) };
}

function download(url, file) {
  try {
    execFileSync("curl", ["-sS", "-f", "-L", "-m", "60", "-A", UA, "-o", file, url], { stdio: "pipe" });
    const size = statSync(file).size;
    const head = readFileSync(file).subarray(0, 4).toString("hex");
    const image = head.startsWith("ffd8") || head === "89504e47";
    if (image && size > 15_000 && size < 1_200_000) return true;
  } catch {
    // échec : on nettoie plus bas
  }
  if (existsSync(file)) rmSync(file);
  return false;
}

const COMMONS = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/i;
const candidatesFor = (r) => {
  const m = COMMONS.exec(r.url);
  if (m) return [960, 500].map((w) => `${m[1]}/thumb/${m[2]}/${m[3]}/${w}px-${m[3]}`).concat(r.url);
  return [r.url];
};

let added = 0;
let searched = 0;
const only = process.argv.slice(2);
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const path = new URL(file, dir);
  const place = JSON.parse(readFileSync(path, "utf8"));
  if (only.length && !only.includes(place.slug)) continue;
  const have = place.media.filter((m) => m.kind === "photo").length;
  if (have >= MAX_PER_PLACE) continue;
  const key = norm(shortName(place.name)).split(" ").filter((t) => t.length >= 3 && !STOP.has(t));
  if (key.length === 0) continue;

  await sleep(3500);
  searched += 1;
  const res = curlJson("https://api.openverse.org/v1/images/", { q: `${key.join(" ")} Mauritius`, license: LICENSES, page_size: "20" });
  if (res.status === 429) {
    console.log("Limite de requêtes Openverse atteinte : arrêt. Relance plus tard, les fiches déjà traitées sont sautées.");
    break;
  }
  if (res.status !== 200) continue;
  let results = [];
  try {
    results = JSON.parse(res.body).results ?? [];
  } catch {
    continue;
  }
  const known = new Set(place.media.map((m) => m.external_url));
  const picked = results
    .filter((r) => {
      const text = norm(`${r.title} ${(r.tags ?? []).map((t) => t.name).join(" ")}`);
      const named = key.every((t) => text.split(" ").includes(t));
      const located = key.length >= 2 || /mauri/.test(text);
      const usable = /^(jpg|jpeg|png)$/i.test(r.filetype ?? "jpg") && (r.width ?? 0) >= 800 && !/\b(map|carte|logo|flag|stamp|timbre|coat|plan|diagram)\b/.test(text);
      return named && located && usable && r.creator && r.license && !known.has(r.url) && !r.mature;
    })
    // Paysage d'abord, puis les plus grandes.
    .sort((a, b) => Number(b.width >= b.height) - Number(a.width >= a.height) || b.width - a.width)
    .slice(0, MAX_PER_PLACE - have);

  const fresh = [];
  for (const r of picked) {
    const index = place.media.length + fresh.length + 1;
    const name = `${place.slug}-${index}.${/png/i.test(r.filetype ?? "") ? "png" : "jpg"}`;
    let ok = false;
    for (const url of candidatesFor(r)) {
      await sleep(3000);
      if ((ok = download(url, out + name))) break;
    }
    if (!ok) continue;
    fresh.push({
      kind: "photo",
      external_url: r.url,
      credit: String(r.creator).replace(/<[^>]+>/g, "").replace(/^['"]|['"]$/g, "").trim().slice(0, 80),
      license: `${LICENSE_LABEL[r.license] ?? r.license}${r.license_version && !["cc0", "pdm"].includes(r.license) ? ` ${r.license_version}` : ""}`,
      source_url: r.foreign_landing_url,
      is_cover: false,
      storage_path: `/photos/${name}`,
    });
  }
  if (fresh.length === 0) continue;
  const now = JSON.parse(readFileSync(path, "utf8"));
  now.media.push(...fresh);
  if (!now.media.some((m) => m.is_cover)) now.media[0].is_cover = true;
  writeFileSync(path, JSON.stringify(now, null, 2) + "\n");
  added += fresh.length;
  console.log(`${place.slug} : +${fresh.length} (${fresh.map((f) => f.license).join(", ")})`);
}
console.log(`Terminé : ${searched} recherche(s), ${added} photo(s) ajoutée(s).`);
