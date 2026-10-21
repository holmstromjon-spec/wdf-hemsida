// Receives an order from /shop/, validates it against the published product list
// (/butik.json – prices are never taken from the browser), creates an order number,
// SAVES the order (Netlify Blobs, listed at /admin/bestallningar/), and then sends a
// confirmation to the customer and a copy to the school via Resend.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY  API key from resend.com                     (required)
//   ORDER_FROM      e.g. "Wilson Dance Factory <order@wilsondancefactory.se>" (required)
//   ORDER_TO        where the school's copy goes, comma-separated for several addresses
//                   (default info@wilsondancefactory.se)
//   ORDER_DRY_RUN   "1" = log the mails instead of sending (for testing)
//   ORDER_STORE     "memory" = keep orders in memory instead of Netlify Blobs (tests)

import { saveOrder, updateOrder } from '../lib/orders.mjs';
import { escapeHtml, sendStatus } from '../lib/mail.mjs';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const kr = (n) => `${n.toLocaleString('sv-SE')} kr`;

function orderNumber(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
  return `WDF-${d}-${rand}`;
}

export function validate(form, butik) {
  const errors = [];
  const text = (k, max) => String(form.get(k) ?? '').trim().slice(0, max);

  const namn = text('namn', 100);
  const epost = text('epost', 200);
  const namntryck = text('namntryck', 100);
  const info = text('info', 2000);

  if (!namn) errors.push('Fyll i ditt namn.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost)) errors.push('Fyll i en giltig e-postadress.');
  if (!namntryck) errors.push('Fyll i namntryck.');
  if ([...namntryck].length > butik.namntryck_max) errors.push(`Namntryck får vara max ${butik.namntryck_max} tecken.`);

  const rader = [];
  for (const p of butik.produkter) {
    const antal = Number.parseInt(String(form.get(`antal_${p.id}`) ?? '0'), 10);
    if (!Number.isFinite(antal) || antal <= 0) continue;
    if (antal > 20) {
      errors.push(`För många av ${p.namn} (max 20).`);
      continue;
    }
    let storlek = '';
    if (p.storlek !== 'ingen') {
      storlek = String(form.get(`storlek_${p.id}`) ?? '');
      if (!butik.storlekar[p.storlek].includes(storlek)) {
        errors.push(`Välj storlek för ${p.namn}.`);
        continue;
      }
      storlek = `${p.storlek === 'vuxen' ? 'Vuxen' : 'Junior'}: ${storlek}`;
    }
    rader.push({ namn: p.namn, antal, storlek, pris: p.pris, summa: antal * p.pris });
  }
  if (rader.length === 0) errors.push('Välj minst en produkt.');

  const summa = rader.reduce((s, r) => s + r.summa, 0);
  return { errors, order: { namn, epost, namntryck, info, rader, summa } };
}

function renderMail(order, nr, butik, forSchool) {
  const rows = order.rader
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px 6px 0">${r.antal} × ${escapeHtml(r.namn)}${r.storlek ? ` (${escapeHtml(r.storlek)})` : ''}</td><td style="padding:6px 0;text-align:right">${kr(r.summa)}</td></tr>`,
    )
    .join('');
  const intro = forSchool
    ? `<p>Ny beställning från <strong>${escapeHtml(order.namn)}</strong> (${escapeHtml(order.epost)}).</p>`
    : `<p>Hej ${escapeHtml(order.namn)}!</p><p>Tack för din beställning hos Wilson Dance Factory. Vi behandlar den när betalningen har kommit in.</p>`;
  const pay = forSchool
    ? ''
    : `<p><strong>Betala ${kr(order.summa)} med Swish till ${escapeHtml(butik.swish)}</strong> och ange <strong>${nr}</strong> som meddelande – eller betala i receptionen.</p>
       <p>Alla produkter levereras med namntryck. Läs våra köpvillkor på <a href="https://wilsondancefactory.se/kopvillkor/">wilsondancefactory.se/kopvillkor/</a>.</p>
       <p>Frågor? Svara på det här mejlet eller ring ${escapeHtml(butik.telefon)}.</p>`;

  const html = `<!doctype html><html lang="sv"><body style="font-family:Arial,sans-serif;color:#111;line-height:1.5;max-width:560px">
    ${intro}
    <h2 style="margin:24px 0 8px">Order ${nr}</h2>
    <table style="border-collapse:collapse;width:100%">${rows}
      <tr><td style="padding:10px 12px 6px 0;border-top:2px solid #111"><strong>Totalt</strong></td><td style="padding:10px 0 6px;border-top:2px solid #111;text-align:right"><strong>${kr(order.summa)}</strong></td></tr>
    </table>
    <p><strong>Namntryck:</strong> ${escapeHtml(order.namntryck)}</p>
    ${order.info ? `<p><strong>Övrig info:</strong><br>${escapeHtml(order.info).replace(/\n/g, '<br>')}</p>` : ''}
    ${pay}
    <p style="color:#666;font-size:13px">Wilson Dance Factory · Kapplöpningsgatan 6, 252 30 Helsingborg</p>
  </body></html>`;

  const textRows = order.rader.map((r) => `${r.antal} × ${r.namn}${r.storlek ? ` (${r.storlek})` : ''}  ${kr(r.summa)}`).join('\n');
  const text = [
    forSchool ? `Ny beställning från ${order.namn} (${order.epost})` : `Hej ${order.namn}! Tack för din beställning hos Wilson Dance Factory.`,
    '',
    `Order ${nr}`,
    textRows,
    `Totalt: ${kr(order.summa)}`,
    `Namntryck: ${order.namntryck}`,
    order.info ? `Övrig info: ${order.info}` : '',
    forSchool ? '' : `\nBetala ${kr(order.summa)} med Swish till ${butik.swish} och ange ${nr} som meddelande – eller betala i receptionen.`,
  ].join('\n');

  return { html, text };
}

export default async (req) => {
  const wantsJson = (req.headers.get('accept') ?? '').includes('application/json');
  const reply = (status, body, redirect) =>
    wantsJson || !redirect ? json(status, body) : Response.redirect(new URL(redirect, req.url), 303);

  if (req.method !== 'POST') return json(405, { ok: false, error: 'Fel metod.' });

  const form = await req.formData();
  // Spam trap: bots fill every field. Pretend it worked.
  if (String(form.get('webbplats') ?? '').trim()) return reply(200, { ok: true, order: 'WDF-0', summa: 0 }, '/tack/');

  let butik;
  try {
    const res = await fetch(new URL('/butik.json', req.url));
    butik = await res.json();
  } catch (err) {
    console.error('Could not load /butik.json', err);
    return reply(500, { ok: false, error: 'Butiken kunde inte laddas.' });
  }
  if (!butik.oppen) return reply(403, { ok: false, error: 'Butiken är stängd just nu.' }, '/shop/');

  const { errors, order } = validate(form, butik);
  if (errors.length) return reply(400, { ok: false, error: errors.join(' ') }, '/shop/#bestall');

  if (process.env.ORDER_DRY_RUN !== '1' && (!process.env.RESEND_API_KEY || !process.env.ORDER_FROM)) {
    console.error('RESEND_API_KEY / ORDER_FROM are not set');
    return reply(500, { ok: false, error: 'Beställningen kunde inte skickas just nu.' });
  }

  const nr = orderNumber();
  // ORDER_TO may list several addresses, comma-separated (e.g. the reception and Paul).
  const schoolTo = (process.env.ORDER_TO || butik.epost).split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.ORDER_FROM || 'Wilson Dance Factory <test@example.com>';

  // 1. Save the order first. If that fails the customer gets an error, never a confirmation,
  //    so an order cannot be "confirmed but lost". The list is at /admin/bestallningar/.
  try {
    await saveOrder({ nr, skapad: new Date().toISOString(), ...order, mejl: { kund: 'väntar', skolan: 'väntar' } });
  } catch (err) {
    console.error('Saving order failed', err);
    return reply(500, { ok: false, error: 'Beställningen kunde inte tas emot just nu.' });
  }

  // 2. Then the mails. A failed mail no longer loses the order – it is recorded on the order.
  const result = sendStatus;
  const kund = await result({ from, to: [order.epost], reply_to: schoolTo[0], subject: `Orderbekräftelse ${nr} – Wilson Dance Factory`, ...renderMail(order, nr, butik, false) });
  const skolan = await result({ from, to: schoolTo, reply_to: order.epost, subject: `Ny beställning ${nr} – ${order.namn}`, ...renderMail(order, nr, butik, true) });
  try {
    await updateOrder(nr, { mejl: { kund, skolan } });
  } catch (err) {
    console.error('Updating mail status failed', err);
  }

  const mailOk = kund === 'skickat' ? '' : '&mejl=0';
  return reply(200, { ok: true, order: nr, summa: order.summa, kundmejl: kund === 'skickat' }, `/tack/?order=${nr}&summa=${order.summa}${mailOk}`);
};
