// Receives a job application from /jobba-hos-oss/ (multipart form with up to 3 files, e.g. a CV),
// validates it, SAVES it with the files (Netlify Blobs, listed at /admin/ansokningar/, deleted
// after 6 months), then mails the school (files attached) and a receipt to the applicant via Resend.
//
// Environment variables: RESEND_API_KEY, ORDER_FROM, ORDER_DRY_RUN, ORDER_STORE as for order.mjs, and
//   JOBS_TO   where applications go, comma-separated for several (default info@wilsondancefactory.se)

import { saveApplication, updateApplication, KEEP_MONTHS } from '../lib/applications.mjs';
import { escapeHtml, sendStatus } from '../lib/mail.mjs';

export const MAX_FILES = 3;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Netlify functions accept about 6 MB per request
export const FILE_TYPES = ['.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.jpg', '.jpeg', '.png'];

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function applicationId(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
  return `JOBB-${d}-${rand}`;
}

export async function validate(form) {
  const errors = [];
  const text = (k, max) => String(form.get(k) ?? '').trim().slice(0, max);
  const a = {
    namn: text('namn', 100),
    epost: text('epost', 200),
    telefon: text('telefon', 40),
    alder: text('alder', 20),
    erfarenhet: text('erfarenhet', 4000),
    motivering: text('motivering', 4000),
  };
  if (!a.namn) errors.push('Fyll i ditt namn.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.epost)) errors.push('Fyll i en giltig e-postadress.');
  if (form.get('samtycke') !== 'ja') errors.push('Du behöver godkänna att vi behandlar dina uppgifter.');

  const uploads = form.getAll('filer').filter((f) => typeof f === 'object' && f && f.size > 0);
  const files = [];
  if (uploads.length > MAX_FILES) errors.push(`Du kan bifoga högst ${MAX_FILES} filer.`);
  for (const f of uploads.slice(0, MAX_FILES)) {
    const namn = String(f.name || 'bilaga').replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 120);
    const ext = namn.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
    if (!FILE_TYPES.includes(ext)) {
      errors.push(`Filen ${namn} har ett format vi inte tar emot. Använd PDF, Word eller en bild (JPG/PNG).`);
      continue;
    }
    files.push({ namn, typ: f.type || 'application/octet-stream', data: await f.arrayBuffer() });
  }
  const total = files.reduce((n, f) => n + f.data.byteLength, 0);
  if (total > MAX_TOTAL_BYTES) errors.push('Filerna är för stora tillsammans (högst 4 MB). Spara CV:t som PDF eller förminska bilderna.');
  return { errors, application: a, files };
}

const field = (label, value) => (value ? `<p><strong>${label}:</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>` : '');

function schoolMail(a, id, files) {
  const html = `<!doctype html><html lang="sv"><body style="font-family:Arial,sans-serif;color:#111;line-height:1.5;max-width:600px">
    <p>Ny jobbansökan från <strong>${escapeHtml(a.namn)}</strong> (${escapeHtml(a.epost)}).</p>
    <h2 style="margin:24px 0 8px">Ansökan ${id}</h2>
    ${field('Telefon', a.telefon)}${field('Ålder', a.alder)}${field('Erfarenhet', a.erfarenhet)}${field('Motivering', a.motivering)}
    <p><strong>Bilagor:</strong> ${files.length ? files.map((f) => escapeHtml(f.namn)).join(', ') : 'inga'}</p>
    <p style="color:#666;font-size:13px">Ansökan finns också på https://wilsondancefactory.se/admin/ansokningar/ och raderas där automatiskt efter ${KEEP_MONTHS} månader. Svara på det här mejlet för att svara den sökande.</p>
  </body></html>`;
  const text = [
    `Ny jobbansökan från ${a.namn} (${a.epost})`, `Ansökan ${id}`, '',
    a.telefon && `Telefon: ${a.telefon}`, a.alder && `Ålder: ${a.alder}`,
    a.erfarenhet && `Erfarenhet:\n${a.erfarenhet}`, a.motivering && `Motivering:\n${a.motivering}`,
    `Bilagor: ${files.map((f) => f.namn).join(', ') || 'inga'}`,
  ].filter(Boolean).join('\n');
  return { html, text };
}

function receiptMail(a) {
  const html = `<!doctype html><html lang="sv"><body style="font-family:Arial,sans-serif;color:#111;line-height:1.5;max-width:560px">
    <p>Hej ${escapeHtml(a.namn)}!</p>
    <p>Tack för din ansökan till Wilson Dance Factory. Vi har tagit emot den och hör av oss när vi har gått igenom den.</p>
    <p>Vi sparar din ansökan i högst ${KEEP_MONTHS} månader. Läs mer i vår integritetspolicy: <a href="https://wilsondancefactory.se/integritetspolicy/">wilsondancefactory.se/integritetspolicy/</a>.</p>
    <p style="color:#666;font-size:13px">Wilson Dance Factory · Kapplöpningsgatan 6, 252 30 Helsingborg</p>
  </body></html>`;
  const text = `Hej ${a.namn}!\n\nTack för din ansökan till Wilson Dance Factory. Vi har tagit emot den och hör av oss när vi har gått igenom den.\n\nVi sparar din ansökan i högst ${KEEP_MONTHS} månader.`;
  return { html, text };
}

export default async (req) => {
  const wantsJson = (req.headers.get('accept') ?? '').includes('application/json');
  const reply = (status, body, redirect) =>
    wantsJson || !redirect ? json(status, body) : Response.redirect(new URL(redirect, req.url), 303);

  if (req.method !== 'POST') return json(405, { ok: false, error: 'Fel metod.' });

  let form;
  try {
    form = await req.formData();
  } catch {
    return reply(400, { ok: false, error: 'Ansökan kunde inte läsas. Är filerna för stora?' });
  }
  // Spam trap: bots fill every field. Pretend it worked.
  if (String(form.get('webbplats') ?? '').trim()) return reply(200, { ok: true }, '/tack-ansokan/');

  const { errors, application, files } = await validate(form);
  if (errors.length) return reply(400, { ok: false, error: errors.join(' ') }, '/jobba-hos-oss/#jobba');

  if (process.env.ORDER_DRY_RUN !== '1' && (!process.env.RESEND_API_KEY || !process.env.ORDER_FROM)) {
    console.error('RESEND_API_KEY / ORDER_FROM are not set');
    return reply(500, { ok: false, error: 'Ansökan kunde inte skickas just nu.' });
  }

  const id = applicationId();
  const to = (process.env.JOBS_TO || 'info@wilsondancefactory.se').split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.ORDER_FROM || 'Wilson Dance Factory <test@example.com>';

  // 1. Save first, so an application cannot be lost to a spam filter.
  try {
    await saveApplication({ id, skapad: new Date().toISOString(), ...application, mejl: { sokande: 'väntar', skolan: 'väntar' } }, files);
  } catch (err) {
    console.error('Saving application failed', err);
    return reply(500, { ok: false, error: 'Ansökan kunde inte tas emot just nu.' });
  }

  // 2. Then the mails; the result is recorded on the application.
  const attachments = files.map((f) => ({ filename: f.namn, content: Buffer.from(f.data).toString('base64') }));
  const skolan = await sendStatus({ from, to, reply_to: application.epost, subject: `Jobbansökan ${id} – ${application.namn}`, attachments, ...schoolMail(application, id, files) });
  const sokande = await sendStatus({ from, to: [application.epost], reply_to: to[0], subject: 'Tack för din ansökan – Wilson Dance Factory', ...receiptMail(application) });
  try {
    await updateApplication(id, { mejl: { sokande, skolan } });
  } catch (err) {
    console.error('Updating mail status failed', err);
  }
  return reply(200, { ok: true, id }, '/tack-ansokan/');
};
