// Exercises the job application form backend (netlify/functions/ansokan.mjs) and the list at
// /admin/ansokningar/ without Netlify or Resend: storage in memory, Resend simulated.
// Usage: node scripts/test-ansokan.mjs

import assert from 'node:assert/strict';

process.env.ORDER_STORE = 'memory';
process.env.ORDER_DRY_RUN = '0';
process.env.RESEND_API_KEY = 're_test';
process.env.ORDER_FROM = 'Wilson Dance Factory <order@wilsondancefactory.se>';
process.env.ADMIN_PASSWORD = 'hemligt';
delete process.env.JOBS_TO;

let resendStatus = 200;
const mails = [];
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.resend.com/')) {
    mails.push(JSON.parse(init.body));
    return new Response(resendStatus === 200 ? '{"id":"x"}' : 'simulated failure', { status: resendStatus });
  }
  throw new Error(`unexpected fetch ${url}`);
};
console.error = () => {};

const { default: handler } = await import('../netlify/functions/ansokan.mjs');
const { default: adminPage } = await import('../netlify/functions/ansokningar.mjs');
const { listApplications, purgeExpired, saveApplication } = await import('../netlify/lib/applications.mjs');

const cv = (name = 'CV Alva.pdf', bytes = 2048) => new File([new Uint8Array(bytes).fill(37)], name, { type: 'application/pdf' });
const valid = { namn: 'Alva Test', epost: 'alva@example.com', telefon: '070-123 45 67', alder: '19', erfarenhet: 'Dansat i 10 år', motivering: 'Jag älskar dans', samtycke: 'ja' };

function post(fields, files = [cv()], json = true) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  for (const f of files) form.append('filer', f);
  return handler(new Request('https://wilsondancefactory.se/.netlify/functions/ansokan', {
    method: 'POST', body: form, headers: json ? { Accept: 'application/json' } : {},
  }));
}

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (err) {
    results.push(`FAIL ${name}: ${err.message}`);
  }
};

await check('valid application → saved, mailed to info@ with the CV attached, receipt to the applicant', async () => {
  mails.length = 0;
  const res = await post(valid);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.match(data.id, /^JOBB-\d{6}-[A-Z0-9]{4}$/);
  const school = mails.find((m) => m.subject.startsWith('Jobbansökan'));
  assert.deepEqual(school.to, ['info@wilsondancefactory.se']);
  assert.equal(school.reply_to, 'alva@example.com');
  assert.equal(school.attachments.length, 1);
  assert.equal(school.attachments[0].filename, 'CV Alva.pdf');
  assert.equal(Buffer.from(school.attachments[0].content, 'base64').length, 2048);
  assert.match(school.html, /Dansat i 10 år/);
  const receipt = mails.find((m) => m.subject.startsWith('Tack för din ansökan'));
  assert.deepEqual(receipt.to, ['alva@example.com']);
  assert.equal(receipt.attachments, undefined, 'no CV back to the applicant');
  const saved = (await listApplications()).find((a) => a.id === data.id);
  assert.equal(saved.filer[0].namn, 'CV Alva.pdf');
  assert.deepEqual(saved.mejl, { sokande: 'skickat', skolan: 'skickat' });
});

await check('no file is fine; no-JS post redirects to /tack-ansokan/', async () => {
  const res = await post(valid, [], false);
  assert.equal(res.status, 303);
  assert.equal(new URL(res.headers.get('location')).pathname, '/tack-ansokan/');
});

await check('missing consent / name / bad e-mail → 400, nothing saved', async () => {
  const before = (await listApplications()).length;
  for (const bad of [{ ...valid, samtycke: '' }, { ...valid, namn: '' }, { ...valid, epost: 'nej' }]) {
    assert.equal((await post(bad)).status, 400);
  }
  assert.equal((await listApplications()).length, before);
});

await check('wrong file type, too many files, too large → 400', async () => {
  assert.match((await (await post(valid, [cv('virus.exe')])).json()).error, /format vi inte tar emot/);
  assert.match((await (await post(valid, [cv('a.pdf'), cv('b.pdf'), cv('c.pdf'), cv('d.pdf')])).json()).error, /högst 3 filer/);
  assert.match((await (await post(valid, [cv('stor.pdf', 5 * 1024 * 1024)])).json()).error, /för stora/);
});

await check('honeypot → fake success, no mail, nothing saved', async () => {
  mails.length = 0;
  const before = (await listApplications()).length;
  assert.equal((await post({ ...valid, webbplats: 'spam' })).status, 200);
  assert.equal(mails.length, 0);
  assert.equal((await listApplications()).length, before);
});

await check('Resend down → still saved, with the failure recorded', async () => {
  resendStatus = 500;
  const data = await (await post(valid)).json();
  resendStatus = 200;
  assert.equal(data.ok, true);
  const saved = (await listApplications()).find((a) => a.id === data.id);
  assert.match(saved.mejl.skolan, /^misslyckades/);
});

const login = { Authorization: 'Basic ' + Buffer.from('paul:hemligt').toString('base64') };
const admin = (path = '', init = {}) => adminPage(new Request(`https://wilsondancefactory.se/admin/ansokningar/${path}`, { ...init, headers: { ...login, ...(init.headers ?? {}) } }));

await check('admin: locked without login, lists applications, escapes text, downloads the CV', async () => {
  assert.equal((await adminPage(new Request('https://wilsondancefactory.se/admin/ansokningar/'))).status, 401);
  const data = await (await post({ ...valid, motivering: '<script>x</script>' })).json();
  const html = await (await admin()).text();
  assert.ok(html.includes(data.id));
  assert.doesNotMatch(html, /<script>x<\/script>/);
  const file = await admin(`?fil=${data.id}&n=0`);
  assert.equal(file.status, 200);
  assert.match(file.headers.get('content-disposition'), /attachment; filename\*=UTF-8''CV%20Alva\.pdf/);
  assert.equal((await file.arrayBuffer()).byteLength, 2048);
});

await check('admin: delete removes the application and its files', async () => {
  const data = await (await post(valid)).json();
  const form = new URLSearchParams({ radera: data.id });
  const res = await admin('', { method: 'POST', body: form, headers: { Origin: 'https://wilsondancefactory.se' } });
  assert.equal(res.status, 303);
  assert.ok(!(await listApplications()).some((a) => a.id === data.id));
  assert.equal((await admin(`?fil=${data.id}&n=0`)).status, 404);
  assert.equal((await admin('', { method: 'POST', body: form, headers: { Origin: 'https://evil.example' } })).status, 403);
});

await check('applications older than 6 months are deleted automatically', async () => {
  const old = new Date();
  old.setMonth(old.getMonth() - 7);
  await saveApplication({ id: 'JOBB-250101-OLD1', skapad: old.toISOString(), namn: 'Gammal' }, [{ namn: 'cv.pdf', typ: 'application/pdf', data: new ArrayBuffer(10) }]);
  const before = (await listApplications()).length;
  assert.equal(await purgeExpired(), 1);
  assert.equal((await listApplications()).length, before - 1);
  assert.equal((await admin('?fil=JOBB-250101-OLD1&n=0')).status, 404);
});

process.stdout.write(results.join('\n') + '\n');
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
