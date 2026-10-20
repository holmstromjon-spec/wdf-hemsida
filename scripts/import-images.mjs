// Copies the images the site actually uses out of the raw WordPress export (uploads/),
// resizes them to at most MAX px and writes them to src/assets/images/<group>/<name>.
// uploads/ is source only and never committed. Re-running is safe: files are overwritten.
//
// Usage: npm run import-images

import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SRC = 'uploads';
const OUT = 'src/assets/images';
const MAX = 2000;

const kebab = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

/** [source relative to uploads/, group, output name without extension] */
const images = [
  ['2022/12/WDF_Logotype_Free.png', 'brand', 'logo'],
  ['2022/12/cropped-WDF_Favicon.png', 'brand', 'favicon'],
  ['2023/04/Swish_Logo_Secondary_Dark-BG_P3.png', 'brand', 'swish'],
  ...[1, 2, 3, 4].map((n) => [`2022/12/WDF_Header_${n}.jpg`, 'headers', `header-${n}`]),
  ...[
    ['Barndans_2-3ars', 'barndans-2-3-ar'],
    ['Dansmix_4-5ars', 'dansmix-4-5-ar'],
    ['Dansmix_6ars', 'dansmix-6-ar'],
    ['Balett', 'balett'],
    ['TikTok', 'tiktok'],
    ['Boys_Only', 'boys-only'],
    ['Show', 'show'],
    ['Breakdance', 'breakdance'],
    ['Disco', 'disco'],
    ['HipHop', 'hiphop'],
    ['Jazz_And_Modernt', 'jazz-modernt'],
    ['Commercial_HipHop', 'commercial-hiphop'],
  ].map(([src, name]) => [`2023/02/Wilson_Dance_Factory_${src}.jpg`, 'dansstilar', name]),
  ...Array.from({ length: 11 }, (_, i) => [
    `2023/04/Wilson_Dance_Factory_Miljobild_${i + 1}.jpg`,
    'miljo',
    `miljo-${i + 1}`,
  ]),
  ['2023/03/Paul_Wilson_Wilson_Dance_Factory.jpg', 'om-oss', 'paul-wilson'],
  ...[
    ['2.-Junior-Hoodie-svart-med-zip-600-kr', 'junior-hoodie'],
    ['2.-Vuxen-Hoodie-svart-med-zip-650-kr', 'vuxen-hoodie'],
    ['3.-Vuxen-T-shirt-svart-280-kr', 'vuxen-t-shirt'],
    ['4.-Junior-T-shirt-svart-280-kr', 'junior-t-shirt'],
    ['6.-Totebag-svart-180-kr', 'totebag'],
    ['7.-Sportbag-svart-460-kr', 'sportbag'],
    ['vattenflaska', 'vattenflaska'],
  ].map(([src, name]) => [`2026/02/${src}.png`, 'butik', name]),
];

// Instructor portraits (2026) and gallery photos are picked up by pattern.
const apr2026 = await readdir(path.join(SRC, '2026/04'));
for (const f of apr2026) {
  const m = f.match(/^(.+)_ny\.png$/);
  if (m) images.push([`2026/04/${f}`, 'instruktorer', kebab(m[1])]);
  const g = f.match(/^(DSC\d+)-scaled-2\.jpg$/);
  if (g) images.push([`2026/04/${f}`, 'galleri', g[1].toLowerCase()]);
}

let done = 0;
let bytesIn = 0;
let bytesOut = 0;
for (const [rel, group, name] of images) {
  const src = path.join(SRC, rel);
  if (!existsSync(src)) {
    console.warn(`MISSING ${rel}`);
    continue;
  }
  await mkdir(path.join(OUT, group), { recursive: true });
  const img = sharp(src).rotate();
  const { isOpaque } = await img.stats();
  const resized = img.resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true });
  const ext = isOpaque ? 'jpg' : 'png';
  const dest = path.join(OUT, group, `${name}.${ext}`);
  const info = isOpaque
    ? await resized.flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true }).toFile(dest)
    : await resized.png({ compressionLevel: 9, palette: false }).toFile(dest);
  bytesIn += (await sharp(src).metadata()).size ?? 0;
  bytesOut += info.size;
  done++;
}
console.log(`${done}/${images.length} images → ${OUT} (${(bytesOut / 1e6).toFixed(1)} MB)`);
