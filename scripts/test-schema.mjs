// Tests the schedule import from the Google Sheet (src/lib/schema-sheet.mjs) and the admin page
// /admin/schema/ (netlify/functions/schema-admin.mjs) without Google or Netlify.
// scripts/fixtures/hemsida-schema.csv is the tab "Hemsida schema" as published 2026-10-21.
// Usage: node scripts/test-schema.mjs

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { parseCsv, parseSchedule, scheduleLines, SHEET_CSV_URL } from '../src/lib/schema-sheet.mjs';

const fixture = readFileSync(new URL('./fixtures/hemsida-schema.csv', import.meta.url), 'utf8');
const parse = (csv) => parseSchedule(parseCsv(csv));

// Simulated network: the sheet, the schedule on the live site, and the Netlify build hook.
let sheetCsv = fixture;
let liveSchedule = null;
const hookCalls = [];
globalThis.fetch = async (url, init) => {
  url = String(url);
  if (url === SHEET_CSV_URL) return new Response(sheetCsv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
  if (url.endsWith('/schema.json')) return liveSchedule ? Response.json(liveSchedule) : new Response('nope', { status: 404 });
  if (url.startsWith('https://api.netlify.com/build_hooks/')) {
    hookCalls.push({ url, method: init?.method });
    return new Response('', { status: 200 });
  }
  throw new Error(`unexpected fetch ${url}`);
};
const { default: adminPage } = await import('../netlify/functions/schema-admin.mjs');

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (err) {
    results.push(`FAIL ${name}: ${err.message}`);
  }
};

await check('the published sheet parses without errors: 7 + 3 groups, 97 classes', () => {
  const s = parse(fixture);
  assert.deepEqual(s.fel, []);
  assert.deepEqual(s.veckoschema.map((g) => g.namn), [
    'Dans för 2-5 år', 'Dans för 6 år', 'Dans för 7-9 år', 'Dans för 10-13 år',
    'Dans för 14+ & Vuxna', 'Pardans/Bugg/Salsa/Bachata', 'Breakdance',
  ]);
  assert.deepEqual(s.tavlingsschema.map((g) => g.namn), ['Hiphop tävling', 'Disco tävling', 'Performing arts tävling']);
  assert.equal(scheduleLines(s).length, 97);
});

await check('days, times and class names are tidied, nothing else', () => {
  const s = parse(fixture);
  const barn = s.veckoschema[0];
  assert.deepEqual(barn.dagar.map((d) => d.dag), ['Måndagar', 'Torsdagar', 'Lördagar', 'Söndagar']);
  assert.deepEqual(barn.dagar[0].pass[0], { tid: '16.00-16.30', klass: 'Dansmix 2-3 år' });
  const lines = scheduleLines(s);
  assert.ok(lines.includes('Vecka › Breakdance › Söndagar › 14.40-15.25 Breakdance forts (12v)'), '15:25 → 15.25');
  assert.ok(lines.includes('Vecka › Dans för 10-13 år › Måndagar › 18.00-18.45 Hiphop 10-13år Forts.2 /Avc'), 'double space collapsed');
  assert.ok(lines.includes('Tävling › Hiphop tävling › Måndagar › 17.30-18.15 Hiphop Grupp'), 'trailing spaces trimmed');
});

await check('quoted cells with commas and line breaks', () => {
  const rows = parseCsv('GRUPP,,\r\nMÅNDAG,,\r\n10.00-11.00,"Disco, nybörjare ""A"""\r\n');
  assert.deepEqual(rows[2], ['10.00-11.00', 'Disco, nybörjare "A"']);
});

const tiny = (body) => `BARN,,\nMÅNDAG,,\n${body}\nTÄVLINGSDANS,,\nDISCO,,\nTISDAG,,\n18.00-19.00,Disco`;

await check('a time without a class is an error with the cell', () => {
  assert.match(parse(tiny('10.00-11.00,')).fel.join(), /A3: tiden 10\.00-11\.00 saknar klass i B3/);
});

await check('a class without a time is an error with the cell', () => {
  assert.match(parse(tiny(',Disco')).fel.join(), /B3: klassen "Disco" saknar tid/);
});

await check('a mistyped time is an error', () => {
  assert.match(parse(tiny('10-11,Disco')).fel.join(), /A3: "10-11" ser inte ut som en tid/);
});

await check('a class before any weekday is an error', () => {
  assert.match(parse('BARN,,\n10.00-11.00,Disco\nTÄVLINGSDANS,,\nX,,\nMÅNDAG,,\n10.00-11.00,Y').fel.join(), /innan någon veckodag/);
});

await check('missing TÄVLINGSDANS row → error, a heading with no classes → error', () => {
  const s = parse('BARN,,\nMÅNDAG,,\n10.00-11.00,Disco\nNY GRUPP,,');
  assert.match(s.fel.join(), /Tävlingsschemat är tomt/);
  assert.match(s.fel.join(), /"Ny grupp" har inga pass/);
});

// Admin page
const URL_ = 'https://wilsondancefactory.se/admin/schema/';
const login = { Authorization: 'Basic ' + Buffer.from('reception:hemligt').toString('base64') };
const get = (headers = login) => adminPage(new Request(URL_, { headers }));
const post = (headers = {}) => adminPage(new Request(URL_, { method: 'POST', headers: { ...login, Origin: 'https://wilsondancefactory.se', ...headers } }));

await check('admin: off without a password, locked without login', async () => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ORDERS_PASSWORD;
  assert.equal((await get()).status, 503);
  process.env.ADMIN_PASSWORD = 'hemligt';
  assert.equal((await get({})).status, 401);
  assert.equal((await get({ Authorization: 'Basic ' + Buffer.from('x:fel').toString('base64') })).status, 401);
});

await check('admin: preview, changes against the live site, publish button', async () => {
  const live = parse(fixture);
  live.veckoschema[0].dagar[0].pass[0].klass = 'Gammal klass';
  liveSchedule = { veckoschema: { grupper: live.veckoschema }, tavlingsschema: { grupper: live.tavlingsschema } };
  const res = await get();
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Arket går att läsa/);
  assert.match(html, /97 pass i 10 grupper/);
  assert.match(html, /1 nya eller ändrade rader, 1 borttagna/);
  assert.match(html, /class="del">Vecka › Dans för 2-5 år › Måndagar › 16\.00-16\.30 Gammal klass/);
  assert.match(html, /<button type="submit">Publicera<\/button>/);
  assert.match(html, /Performing arts tävling/);
});

await check('admin: no changes → says so', async () => {
  const live = parse(fixture);
  liveSchedule = { veckoschema: { grupper: live.veckoschema }, tavlingsschema: { grupper: live.tavlingsschema } };
  assert.match(await (await get()).text(), /Inga ändringar/);
});

await check('admin: errors in the sheet → listed, no publish button', async () => {
  sheetCsv = fixture.replace('16.00-16.30,Dansmix 2-3 år', '16.00-16.30,');
  const html = await (await get()).text();
  assert.match(html, /kan inte publiceras ännu/);
  assert.match(html, /A3: tiden 16\.00-16\.30 saknar klass/);
  assert.doesNotMatch(html, /<button/);
});

await check('admin: publishing with errors in the sheet does not start a build', async () => {
  process.env.SCHEMA_BUILD_HOOK = 'https://api.netlify.com/build_hooks/test';
  hookCalls.length = 0;
  const res = await post();
  assert.equal(res.status, 303);
  assert.equal(hookCalls.length, 0);
  sheetCsv = fixture;
});

await check('admin: publish calls the build hook and comes back with a confirmation', async () => {
  hookCalls.length = 0;
  const res = await post();
  assert.equal(res.status, 303);
  assert.equal(hookCalls.length, 1);
  assert.equal(hookCalls[0].method, 'POST');
  assert.match(hookCalls[0].url, /^https:\/\/api\.netlify\.com\/build_hooks\/test\?trigger_title=/);
  const back = new URL(res.headers.get('location'));
  assert.equal(back.pathname, '/admin/schema/');
  const html = await (await adminPage(new Request(back, { headers: login }))).text();
  assert.match(html, /Publiceringen startades kl\./);
});

await check('admin: publish from another site is refused; without hook → 503', async () => {
  hookCalls.length = 0;
  assert.equal((await post({ Origin: 'https://evil.example' })).status, 403);
  assert.equal(hookCalls.length, 0);
  delete process.env.SCHEMA_BUILD_HOOK;
  assert.equal((await post()).status, 503);
});

process.stdout.write(results.join('\n') + '\n');
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
