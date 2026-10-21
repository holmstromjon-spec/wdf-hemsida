// /admin/bestallningar/ – every shop order, newest first, behind the admin password
// (see netlify/lib/admin.mjs). Orders are stored by order.mjs (Netlify Blobs).

import { listOrders } from '../lib/orders.mjs';
import { escapeHtml, guard, page, respond } from '../lib/admin.mjs';

const kr = (n) => `${Number(n || 0).toLocaleString('sv-SE')} kr`;
const when = (iso) =>
  new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' });

const style = `th{position:sticky;top:0} .nr{font-weight:600;white-space:nowrap}
  ul{margin:0;padding-left:1.1rem} .sum{white-space:nowrap;font-weight:600}`;

export default async (req) => {
  const stop = guard(req, 'Beställningar');
  if (stop) return stop;

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

  return respond(page('Beställningar – Wilson Dance Factory', body, style));
};

export const config = { path: ['/admin/bestallningar', '/admin/bestallningar/'] };
