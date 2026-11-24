// Planche-contact des photos de couverture, pour contrôle visuel avant mise en ligne (outil de relecture).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../content/places/", import.meta.url);
const [, , outFile, from = "0", count = "48", filter = ""] = process.argv;
const rows = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")))
  .flatMap((p) => p.media.filter((m) => m.storage_path && (!filter || m.license.includes(filter))).map((m, i) => ({ p, m, i })))
  .slice(Number(from), Number(from) + Number(count));
const html = `<body style="margin:0;font:11px sans-serif;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:4px;background:#222;color:#fff">${rows
  .map(({ p, m }) => `<div><img src="file://${new URL("../public" + m.storage_path, import.meta.url).pathname}" style="width:100%;height:120px;object-fit:cover;display:block"><div style="height:28px;overflow:hidden">${p.slug}<br>${m.credit.slice(0, 28)}</div></div>`)
  .join("")}</body>`;
writeFileSync(outFile, html);
console.log(rows.length);
