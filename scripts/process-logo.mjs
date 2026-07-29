import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(
  root,
  "public/AccesoFutbol_Primary_Color_Transparent.png",
);

/** Remove leftover black or teal matte pixels so the logo is truly transparent. */
async function cleanTransparency(inputPath) {
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const isNearBlack = r < 40 && g < 40 && b < 40;
    const isTealMatte =
      g > r + 15 &&
      g > b + 15 &&
      g > 80 &&
      Math.abs(r - b) < 50;

    if (isNearBlack || isTealMatte) {
      data[i + 3] = 0;
    } else if (a < 255 && a > 0) {
      data[i + 3] = a;
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png();
}

/** Recolor near-white/light-gray pixels to dark navy, for use on light backgrounds. */
async function makeDarkVariant(inputPath) {
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;

    const isLight = r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
    if (isLight) {
      data[i] = 17;
      data[i + 1] = 24;
      data[i + 2] = 39; // gray-900
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png();
}

async function main() {
  const cleaned = await cleanTransparency(source);
  const trimmed = cleaned.trim({ threshold: 10 });

  const logoPath = path.join(root, "public/logo.png");
  await trimmed.clone().resize(512, 512, { fit: "inside" }).png().toFile(logoPath);

  // Dark-text variant for light backgrounds (e.g. the media kit's white nav).
  const darkVariant = await makeDarkVariant(logoPath);
  const logoDarkPath = path.join(root, "public/logo-dark.png");
  await darkVariant.clone().resize(512, 512, { fit: "inside" }).png().toFile(logoDarkPath);

  const iconPath = path.join(root, "src/app/icon.png");
  await trimmed
    .clone()
    .resize(32, 32, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(iconPath);

  const appleIconPath = path.join(root, "src/app/apple-icon.png");
  await trimmed
    .clone()
    .resize(180, 180, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(appleIconPath);

  const favicon32 = await trimmed
    .clone()
    .resize(32, 32, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const favicon16 = await trimmed
    .clone()
    .resize(16, 16, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const faviconPath = path.join(root, "src/app/favicon.ico");
  await sharp(favicon32).toFile(faviconPath);

  const publicFavicon = path.join(root, "public/favicon.ico");
  await writeFile(publicFavicon, await readFile(faviconPath));

  console.log("Created:", logoPath, logoDarkPath, iconPath, appleIconPath, faviconPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
