// Crops the shop product images (src/assets/images/butik/) to the product itself:
// the name and price that were baked into the bottom of the images are cut away (the page shows
// them as text), and each product is centred on a white square so it fills the product card.
// Finds the product as the top block of non-white rows; the text box further down is ignored.
// Usage: node scripts/crop-shop-images.mjs <file.jpg> [...]   (overwrites the files)

import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

sharp.cache(false);

const SIZE = 1000;
const FILL = 0.86; // share of the square the product may take
const INK = 235; // a pixel darker than this (0–255) belongs to the product or its shadow
const WHITE_FROM = 215, WHITE_AT = 235; // pixels lighter than this ramp to pure white

for (const file of process.argv.slice(2)) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Skip the outer 5 % (the faint card frame drawn in the images).
  const x0 = Math.round(w * 0.05), x1 = Math.round(w * 0.95), yStart = Math.round(h * 0.03);
  const rowHasInk = (y) => {
    for (let x = x0; x < x1; x++) if (data[y * w + x] < INK) return true;
    return false;
  };
  let top = yStart;
  while (top < h && !rowHasInk(top)) top++;
  // The product ends at the first gap of blank rows (2 % of the height).
  let bottom = top, blank = 0;
  for (let y = top; y < h && blank < h * 0.02; y++) {
    if (rowHasInk(y)) { bottom = y; blank = 0; } else blank++;
  }
  let left = x1, right = x0;
  for (let y = top; y <= bottom; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[y * w + x] < INK) { if (x < left) left = x; if (x > right) right = x; }
    }
  }
  const box = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const scale = (SIZE * FILL) / Math.max(box.width, box.height);
  const pw = Math.round(box.width * scale), ph = Math.round(box.height * scale);
  // Near-white background (some photos sit on a light grey box) becomes pure white, with a soft
  // ramp so edges do not get jagged. The products are black, so they are not affected.
  const { data: px, info: pi } = await sharp(file).extract(box).resize(pw, ph).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < px.length; i += 3) {
    const t = (Math.min(px[i], px[i + 1], px[i + 2]) - WHITE_FROM) / (WHITE_AT - WHITE_FROM);
    if (t <= 0) continue;
    const k = Math.min(1, t);
    for (let c = 0; c < 3; c++) px[i + c] = Math.round(px[i + c] + (255 - px[i + c]) * k);
  }
  const product = await sharp(px, { raw: { width: pi.width, height: pi.height, channels: 3 } }).png().toBuffer();
  const out = await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#ffffff' } })
    .composite([{ input: product, left: Math.round((SIZE - pw) / 2), top: Math.round((SIZE - ph) / 2) }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  await writeFile(file, out); // not sharp().toFile: Windows keeps the source open
  console.log(`${file}: product ${box.width}×${box.height} at ${box.left},${box.top} of ${w}×${h} → ${SIZE}×${SIZE}`);
}
