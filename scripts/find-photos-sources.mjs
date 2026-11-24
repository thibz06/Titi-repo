// pnpm photos:sources — pour les fiches sans photo, récupère l'image principale (og:image) du site
// officiel du lieu ou des pages déjà citées en source. Ces images ne sont PAS sous licence libre :
// décision de Thibault (24 novembre 2026), pour une app à usage strictement privé. Chaque image garde
// le nom du site et le lien vers la page d'où elle vient.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = new URL("../content/places/", import.meta.url);
const out = fileURLToPath(new URL("../public/photos/", import.meta.url));
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = "content-research-bot/1.0";
const SKIP_HOST = /(wikipedia|wikidata|wikimedia|openstreetmap|nominatim|govmu\.org$|unesco|faolex|fao\.org|timeanddate)/;
const BAD_IMAGE = /(logo|favicon|placeholder|default|avatar|sprite|icon|banner-pub|share-default|blank|og-home|pixel|tracking|\.svg)/i;

function get(url) {
  try {
    return execFileSync("curl", ["-sS", "-L", "-f", "-m", "40", "-A", UA, url], { encoding: "utf8", maxBuffer: 30e6, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function ogImage(html, base) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  for (const key of ["og:image:secure_url", "og:image", "twitter:image"]) {
    for (const tag of metas) {
      if (!new RegExp(`(?:property|name)=["']${key}["']`, "i").test(tag)) continue;
      const content = /content=["']([^"']+)["']/i.exec(tag)?.[1];
      if (!content) continue;
      try {
        return new URL(content.replace(/&amp;/g, "&"), base).href;
      } catch {
        // contenu inutilisable
      }
    }
  }
  return null;
}

/** Sans og:image : les grandes images de la page (les petites, logos et pictos sont écartés au téléchargement). */
function pageImages(html, base) {
  const urls = [];
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const raw = /(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i.exec(tag[0])?.[1];
    if (!raw || raw.startsWith("data:")) continue;
    try {
      const u = new URL(raw.replace(/&amp;/g, "&"), base).href;
      if (/\.(jpe?g|png|webp)(\?|$)/i.test(u) && !BAD_IMAGE.test(u) && !urls.includes(u)) urls.push(u);
    } catch {
      // adresse inutilisable
    }
  }
  return urls.slice(0, 6);
}

function download(url, file, minSize = 30_000) {
  try {
    execFileSync("curl", ["-sS", "-f", "-L", "-m", "60", "-A", UA, "-o", file, url], { stdio: "pipe" });
    const size = statSync(file).size;
    const head = readFileSync(file).subarray(0, 4).toString("hex");
    const ext = head.startsWith("ffd8") ? "jpg" : head === "89504e47" ? "png" : head === "52494646" ? "webp" : null;
    if (ext && size > minSize && size < 1_500_000) return ext;
  } catch {
    // échec
  }
  if (existsSync(file)) rmSync(file);
  return null;
}

const seenImages = new Set();
let added = 0;
const only = process.argv.slice(2);
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const path = new URL(file, dir);
  const place = JSON.parse(readFileSync(path, "utf8"));
  if (only.length && !only.includes(place.slug)) continue;
  if (place.media.length > 0) continue;
  const pages = [...new Set([place.website_url, ...place.sources.map((s) => s.url)].filter(Boolean))].filter((u) => {
    try {
      const { hostname, pathname } = new URL(u);
      // Une page d'accueil de journal ne montre pas le lieu : il faut une page propre au lieu, sauf pour son site officiel.
      return !SKIP_HOST.test(hostname) && (u === place.website_url || pathname.length > 1) && !/\.pdf$/i.test(pathname);
    } catch {
      return false;
    }
  });
  for (const page of pages.slice(0, 4)) {
    await sleep(1500);
    const html = get(page);
    if (!html) continue;
    const tmp = `${out}${place.slug}-s1.tmp`;
    let image = null;
    let ext = null;
    const og = ogImage(html, page);
    // L'image annoncée par la page d'abord ; à défaut, la première grande image du contenu.
    for (const [candidate, minSize] of [...(og ? [[og, 30_000]] : []), ...pageImages(html, page).map((u) => [u, 70_000])]) {
      if (BAD_IMAGE.test(candidate) || seenImages.has(candidate)) continue;
      await sleep(800);
      ext = download(candidate, tmp, minSize);
      if (ext) {
        image = candidate;
        break;
      }
    }
    if (!image || !ext) continue;
    seenImages.add(image);
    const name = `${place.slug}-s1.${ext}`;
    execFileSync("mv", [tmp, out + name]);
    const now = JSON.parse(readFileSync(path, "utf8"));
    if (now.media.length > 0) break; // une photo libre est arrivée entre-temps
    now.media.push({
      kind: "photo",
      external_url: image,
      credit: new URL(page).hostname.replace(/^www\./, ""),
      license: "Droits réservés",
      source_url: page,
      is_cover: true,
      storage_path: `/photos/${name}`,
    });
    writeFileSync(path, JSON.stringify(now, null, 2) + "\n");
    added += 1;
    console.log(`${place.slug} : ${new URL(page).hostname}`);
    break;
  }
}
console.log(`Terminé : ${added} image(s) ajoutée(s).`);
