// /admin/bestallningar/ – every shop order, newest first, behind a password.
// The browser asks for a username and password: any username, and the password in the
// environment variable ORDERS_PASSWORD. Orders are stored by order.mjs (Netlify Blobs).

import { listOrders } from '../lib/orders.mjs';

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const kr = (n) => `${Number(n || 0).toLocaleString('sv-SE')} kr`;
const when = (iso) =>
  new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' });

function authorized(req) {
  const password = process.env.ORDERS_PASSWORD;
  if (!password) return false;
  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  return decoded.slice(decoded.indexOf(':') + 1) === password;
}

const page = (title, body) => `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;padding:1.5rem;color:#201f1f;background:#f4f3f3}
  h1{font-weight:400;margin:0 0 .25rem} p{margin:.25rem 0 1rem;color:#5d5b5b}
  table{width:100%;border-collapse:collapse;background:#fff;font-size:.9rem}
  th,td{text-align:left;vertical-align:top;padding:.6rem .7rem;border-bottom:1px solid #e2e0e0}
  th{background:#201f1f;color:#fff;font-weight:500;position:sticky;top:0}
  .nr{font-weight:600;white-space:nowrap} .ok{color:#1d7a3a} .fel{color:#c42a20;font-weight:600}
  ul{margin:0;padding-left:1.1rem} .sum{white-space:nowrap;font-weight:600}
</style></head><body>${body}</body></html>`;

export default async (req) => {
  if (!process.env.ORDERS_PASSWORD) {
    return new Response(page('Beställningar', '<h1>Beställningar</h1><p>Orderlistan är inte aktiverad (ORDERS_PASSWORD saknas i Netlify).</p>'), {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  if (!authorized(req)) {
    return new Response('Inloggning krävs', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Wilson Dance Factory - bestallningar", charset="UTF-8"', 'X-Robots-Tag': 'noindex' },
    });
  }

  const orders = await listOrders();
  const status = (s) => (s === 'skickat' ? '<span class="ok">✓ skickat</span>' : `<span class="fel">${escapeHtml(s)}</span>`);
  const rows = orders
    .map(
      (o) => `<tr>
  <td class="nr">${escapeHtml(o.nr)}<br><small>${escapeHtml(when(o.skapad))}</small></td>
  <td>${escapeHtml(o.namn)}<br><a href="mailto:${escapeHtml(o.epost)}">${escapeHtml(o.epost)}</a></td>
  <td><ul>${(o.rader ?? []).map((r) => `<li>${r.antal} × ${escapeHtml(r.namn)}${r.storlek ? ` (${escapeHtml(r.storlek)})` : ''}</li>`).join('')}</ul></td>
  <td>${escapeHtml(o.namntryck)}</td>
  <td>${escapeHtml(o.info).replace(/\n/g, '<br>')}</td>
  <td class="sum">${kr(o.summa)}</td>
  <td>Kund: ${status(o.mejl?.kund)}<br>Skolan: ${status(o.mejl?.skolan)}</td>
</tr>`,
    )
    .join('');

  const body = `<h1>Beställningar</h1>
<p>${orders.length} beställning${orders.length === 1 ? '' : 'ar'}, nyast först. Matcha Swish-betalningar mot ordernumret.</p>
<table><thead><tr><th>Order</th><th>Kund</th><th>Produkter</th><th>Namntryck</th><th>Övrig info</th><th>Summa</th><th>Mejl</th></tr></thead>
<tbody>${rows || '<tr><td colspan="7">Inga beställningar ännu.</td></tr>'}</tbody></table>`;

  return new Response(page('Beställningar – Wilson Dance Factory', body), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
};

export const config = { path: ['/admin/bestallningar', '/admin/bestallningar/'] };
