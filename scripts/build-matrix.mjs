// pnpm matrix:build — temps de trajet en voiture entre toutes les fiches, via OSRM (données OpenStreetMap).
// Ce sont des estimations sans trafic : le fichier garde la source et l'heure du calcul.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../content/places/", import.meta.url);
const places = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")))
  .map((p) => ({ slug: p.slug, lat: p.lat, lng: p.lng }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

const SERVER = "https://router.project-osrm.org";
const CHUNK = 40; // sources par requête, pour rester sous les limites du serveur public
const coords = places.map((p) => `${p.lng},${p.lat}`).join(";");
const minutes = [];
const km = [];

for (let start = 0; start < places.length; start += CHUNK) {
  const sources = places.slice(start, start + CHUNK).map((_, i) => start + i).join(";");
  const url = `${SERVER}/table/v1/driving/${coords}?annotations=duration,distance&sources=${sources}`;
  const res = await fetch(url, { headers: { "User-Agent": "travel-matrix-builder/1.0" } });
  if (!res.ok) throw new Error(`OSRM a répondu ${res.status} : ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (data.code !== "Ok") throw new Error(`OSRM : ${data.code}`);
  for (const row of data.durations) minutes.push(row.map((s) => (s == null ? null : Math.round(s / 60))));
  for (const row of data.distances) km.push(row.map((m) => (m == null ? null : Math.round(m / 100) / 10)));
  await new Promise((r) => setTimeout(r, 1500));
}

const out = {
  source: "OSRM (router.project-osrm.org), données © contributeurs OpenStreetMap",
  note: "Estimation en voiture, sans trafic.",
  computed_at: new Date().toISOString(),
  slugs: places.map((p) => p.slug),
  minutes,
  km,
};
writeFileSync(new URL("../content/travel-times.json", import.meta.url), JSON.stringify(out) + "\n");
console.log(`Matrice écrite : ${places.length} lieux, ${minutes.flat().filter((x) => x == null).length} trajets inconnus.`);
