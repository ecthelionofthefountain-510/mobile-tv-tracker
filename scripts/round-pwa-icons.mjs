import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const icons = [
  "public/icons/tv_tracker_192.png",
  "public/icons/tv_tracker_512.png",
];

function buildRoundedRectMaskSvg(width, height, radius) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/>` +
      `</svg>`,
  );
}

async function roundIcon(iconPath) {
  const absPath = path.join(projectRoot, iconPath);

  const image = sharp(absPath);
  const meta = await image.metadata();
  const width = meta.width;
  const height = meta.height;

  if (!width || !height) {
    throw new Error(`Could not read dimensions for ${iconPath}`);
  }

  const radius = Math.max(1, Math.round(Math.min(width, height) * 0.18));
  const maskSvg = buildRoundedRectMaskSvg(width, height, radius);

  const rounded = sharp(absPath)
    .ensureAlpha()
    .composite([{ input: maskSvg, blend: "dest-in" }]);

  const tmpPath = absPath + ".tmp";
  await rounded.png().toFile(tmpPath);
  await fs.rename(tmpPath, absPath);

  return { width, height, radius };
}

const results = [];
for (const iconPath of icons) {
  // eslint-disable-next-line no-console
  console.log(`Rounding corners: ${iconPath}`);
  // eslint-disable-next-line no-await-in-loop
  const info = await roundIcon(iconPath);
  results.push({ iconPath, ...info });
}

// eslint-disable-next-line no-console
console.log("Done.");
for (const r of results) {
  // eslint-disable-next-line no-console
  console.log(`- ${r.iconPath}: ${r.width}x${r.height}, radius=${r.radius}`);
}
