// pnpm photos:resize — réduit les images de public/photos à 1200 px de large au plus et les réencode,
// pour que l'app reste légère sur réseau mobile. Les fichiers déjà petits sont laissés tels quels.
import { readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = fileURLToPath(new URL("../public/photos/", import.meta.url));
let saved = 0;
for (const name of readdirSync(dir)) {
  if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
  const file = dir + name;
  const before = statSync(file).size;
  const image = sharp(file, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  if (before < 180_000 && (meta.width ?? 0) <= 1200) continue;
  const resized = image.resize({ width: 1200, withoutEnlargement: true });
  const buffer = /\.png$/i.test(name)
    ? await resized.png({ compressionLevel: 9, palette: true }).toBuffer()
    : /\.webp$/i.test(name)
      ? await resized.webp({ quality: 76 }).toBuffer()
      : await resized.jpeg({ quality: 76, mozjpeg: true }).toBuffer();
  if (buffer.length >= before) continue;
  writeFileSync(file + ".tmp", buffer);
  renameSync(file + ".tmp", file);
  saved += before - buffer.length;
}
console.log(`Photos réduites : ${(saved / 1e6).toFixed(1)} Mo gagnés.`);
