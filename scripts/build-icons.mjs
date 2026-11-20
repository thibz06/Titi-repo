// Génère les PNG du manifeste à partir de public/icons/icon.svg (icône provisoire).
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url), "utf8");
const targets = [
  { file: "icon-192.png", size: 192, scale: 1 },
  { file: "icon-512.png", size: 512, scale: 1 },
  { file: "apple-touch-icon.png", size: 180, scale: 1 },
  // Maskable : motif réduit pour rester dans la zone sûre (80 % au centre).
  { file: "icon-maskable-512.png", size: 512, scale: 0.78 },
];

const browser = await chromium.launch();
for (const { file, size, scale } of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0;background:#0FB5BA;display:grid;place-items:center;height:100vh">
       <div style="width:${size * scale}px;height:${size * scale}px">${svg}</div></body>`,
  );
  const png = await page.screenshot({ type: "png" });
  await writeFile(new URL(`../public/icons/${file}`, import.meta.url), png);
  await page.close();
}
await browser.close();
console.log("Icônes générées :", targets.map((t) => t.file).join(", "));
