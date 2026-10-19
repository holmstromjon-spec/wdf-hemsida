// Exercises netlify/functions/order.mjs without Netlify or Resend.
// /butik.json is read from the last build (dist/), mails are logged (ORDER_DRY_RUN=1).
// Usage: npm run build && node scripts/test-order.mjs

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

process.env.ORDER_DRY_RUN = '1';
const butik = readFileSync('dist/butik.json', 'utf8');
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).endsWith('/butik.json')) return new Response(butik);
  return realFetch(url, init);
};
const logs = [];
console.log = (...a) => logs.push(a.join(' '));
console.error = () => {};

const { default: handler } = await import('../netlify/functions/order.mjs');

const post = (fields, json = true) =>
  handler(
    new Request('https://wilsondancefactory.se/.netlify/functions/order', {
      method: 'POST',
      body: new URLSearchParams(fields),
      headers: json ? { Accept: 'application/json' } : {},
    }),
  );

const valid = {
  namn: 'Test Testsson',
  epost: 'test@example.com',
  namntryck: 'ALVA',
  'antal_vuxen-hoodie': '2',
  'storlek_vuxen-hoodie': 'M',
  antal_vattenflaska: '1',
  info: 'Ett namn per plagg',
};

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (err) {
    results.push(`FAIL ${name}: ${err.message}`);
  }
};

await check('valid order → 200, order number, server-side total', async () => {
  const res = await post(valid);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.match(data.order, /^WDF-\d{6}-[A-Z0-9]{4}$/);
  assert.equal(data.summa, 2 * 650 + 100);
  const mails = logs.filter((l) => l.startsWith('[ORDER_DRY_RUN]'));
  assert.equal(mails.length, 2, 'two mails: customer + school');
  assert.match(mails[0], /"to": \[\s*"test@example.com"/);
  assert.match(mails[1], /"to": \[\s*"info@wilsondancefactory.se"/);
  assert.match(mails[0], /123 453 16 04/);
});

await check('no-JS form post → 303 redirect to /tack/', async () => {
  const res = await post(valid, false);
  assert.equal(res.status, 303);
  assert.match(res.headers.get('location'), /\/tack\/\?order=WDF-/);
});

await check('price in the request is ignored', async () => {
  const data = await (await post({ ...valid, 'pris_vuxen-hoodie': '1', summa: '1' })).json();
  assert.equal(data.summa, 1400);
});

await check('no products → 400', async () => {
  const res = await post({ namn: 'A', epost: 'a@b.se', namntryck: 'X' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /minst en produkt/);
});

await check('missing size → 400', async () => {
  const res = await post({ ...valid, 'storlek_vuxen-hoodie': '' });
  assert.equal(res.status, 400);
});

await check('unknown size → 400', async () => {
  const res = await post({ ...valid, 'storlek_vuxen-hoodie': 'XXXL' });
  assert.equal(res.status, 400);
});

await check('name print over 12 characters → 400', async () => {
  const res = await post({ ...valid, namntryck: 'ABCDEFGHIJKLM' });
  assert.equal(res.status, 400);
});

await check('bad e-mail → 400', async () => {
  const res = await post({ ...valid, epost: 'inte-en-adress' });
  assert.equal(res.status, 400);
});

await check('honeypot filled → fake success, no mail', async () => {
  const before = logs.length;
  const res = await post({ ...valid, webbplats: 'spam' });
  assert.equal(res.status, 200);
  assert.equal(logs.length, before);
});

await check('HTML in fields is escaped in the mail', async () => {
  await post({ ...valid, info: '<script>x</script>' });
  const last = JSON.parse(logs.filter((l) => l.startsWith('[ORDER_DRY_RUN]')).at(-1).slice(16));
  assert.doesNotMatch(last.html, /<script>/);
  assert.match(last.html, /&lt;script&gt;/);
});

await check('GET → 405', async () => {
  const res = await handler(new Request('https://x.se/.netlify/functions/order'));
  assert.equal(res.status, 405);
});

process.stdout.write(results.join('\n') + '\n');
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
