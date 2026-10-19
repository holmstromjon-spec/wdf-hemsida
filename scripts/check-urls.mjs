// Checks the built site (dist/) against the URL inventory in INVENTERING.md §1:
// every kept URL exists, every linked anchor exists, removed URLs are gone,
// and every internal link on every page points at something that exists.
// Usage: npm run build && npm run check-urls

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST = 'dist';

const keep = [
  '/', '/dansa-med-oss/', '/dansstilar/', '/instruktorer/', '/jobba-hos-oss/', '/tavlingsdans/',
  '/schema/', '/anmalan/', '/priser/', '/om-oss/', '/gallerifoo/', '/kontakt/', '/shop/', '/tack/',
  '/aktuellt/', '/kopvillkor/', '/integritetspolicy/',
];
const anchors = ['/aktuellt/#bilder', '/schema/#tavlingsschema', '/jobba-hos-oss/#jobba', '/anmalan/#bokningsvillkor'];
const removed = [
  '/varukorg/', '/underombyggnad/', '/bildgalleri/', '/login-designer/', '/password-protected/',
  '/category/uncategorized/', '/test/', '/nyheter/',
];

const file = (url) => path.join(DIST, url, 'index.html');
const read = (url) => readFileSync(file(url), 'utf8');
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`FAIL ${msg}`);
};

for (const url of keep) if (!existsSync(file(url))) fail(`missing page ${url}`);
for (const url of removed) if (existsSync(file(url))) fail(`removed page still built ${url}`);
for (const a of anchors) {
  const [url, id] = a.split('#');
  if (existsSync(file(url)) && !read(url).includes(`id="${id}"`)) fail(`missing anchor ${a}`);
}

// Internal links on every built page.
const pages = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html') pages.push(p);
  }
};
walk(DIST);
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    const [pathname, hash] = href.split('#');
    if (pathname.startsWith('/_astro/') || pathname.startsWith('/fonts/') || /\.\w+$/.test(pathname)) {
      if (!existsSync(path.join(DIST, pathname))) fail(`${p}: broken asset ${href}`);
      continue;
    }
    if (pathname.startsWith('/.netlify/')) continue;
    if (!pathname.endsWith('/')) fail(`${p}: link without trailing slash ${href}`);
    if (!existsSync(file(pathname))) fail(`${p}: broken link ${href}`);
    else if (hash && !read(pathname).includes(`id="${hash}"`)) fail(`${p}: broken anchor ${href}`);
  }
}

console.log(failures ? `\n${failures} problem(s)` : `OK – ${keep.length} URLs, ${anchors.length} anchors, ${pages.length} pages checked`);
process.exit(failures ? 1 : 0);
