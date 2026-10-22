// /admin/bestallningar/ – every shop order, newest first, behind the admin password
// (see netlify/lib/admin.mjs). Orders are stored by order.mjs (Netlify Blobs).
// Staff can also delete an order (test or cancelled) and add one by hand (e.g. an order taken
// in the reception, or one from before the list existed on 2026-10-21).

import { deleteOrder, getOrder, listOrders, saveOrder } from '../lib/orders.mjs';
import { escapeHtml, guard, page, respond } from '../lib/admin.mjs';

const kr = (n) => `${Number(n || 0).toLocaleString('sv-SE')} kr`;
const when = (iso) =>
  new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' });
const ORDER_NR = /^WDF-\d{6}-[A-Z0-9]{4}$/;

const style = `th{position:sticky;top:0} .nr{font-weight:600;white-space:nowrap}
  ul{margin:0;padding-left:1.1rem} .sum{white-space:nowrap;font-weight:600} .manual{color:#5d5b5b}
  td button{font:inherit;background:none;border:1px solid #c42a20;color:#c42a20;border-radius:4px;padding:.25rem .6rem;cursor:pointer}
  details{margin-top:2rem;max-width:44rem;background:#fff;padding:1rem 1.25rem} summary{cursor:pointer;font-weight:600}
  .add{display:grid;gap:.75rem;margin-top:1rem} .add label{display:grid;gap:.25rem;font-size:.9rem}
  .add input,.add textarea{font:inherit;padding:.45rem .6rem;border:1px solid #bdbaba;border-radius:4px}
  .add button{justify-self:start;font:inherit;font-weight:600;background:#c42a20;color:#fff;border:0;border-radius:4px;padding:.6rem 1.2rem;cursor:pointer}
  .msg{background:#fff;border-left:4px solid #c42a20;padding:.75rem 1rem;max-width:44rem;color:#201f1f}`;

function newNumber(date) {
  const d = date.toISOString().slice(2, 10).replace(/-/g, '');
  return `WDF-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')}`;
}

async function addManual(form) {
  const text = (k, max) => String(form.get(k) ?? '').trim().slice(0, max);
  const datum = text('datum', 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(datum) ? new Date(`${datum}T12:00:00Z`) : new Date();
  const nr = text('nr', 20).toUpperCase() || newNumber(date);
  const namn = text('namn', 100);
  const produkter = text('produkter', 2000).split('\n').map((s) => s.trim()).filter(Boolean);
  if (!ORDER_NR.test(nr)) return 'Ordernumret ska se ut som WDF-261020-8NVX (eller lämnas tomt).';
  if (!namn || !produkter.length) return 'Fyll i minst namn och produkter.';
  if (await getOrder(nr)) return `Order ${nr} finns redan i listan.`;
  await saveOrder({
    nr,
    skapad: date.toISOString(),
    namn,
    epost: text('epost', 200),
    namntryck: text('namntryck', 100),
    info: text('info', 2000),
    rader: produkter.map((p) => ({ text: p })),
    summa: Number.parseInt(text('summa', 10), 10) || 0,
    manuell: true,
  });
  return '';
}

export default async (req) => {
  const stop = guard(req, 'Beställningar');
  if (stop) return stop;
  const url = new URL(req.url);

  if (req.method === 'POST') {
    const from = req.headers.get('origin');
    if (from && from !== url.origin) return respond('Fel ursprung', 403);
    const form = await req.formData();
    let fel = '';
    if (form.get('radera')) {
      const nr = String(form.get('radera'));
      if (ORDER_NR.test(nr)) await deleteOrder(nr);
    } else {
      fel = await addManual(form);
    }
    return Response.redirect(`${url.origin}/admin/bestallningar/${fel ? `?fel=${encodeURIComponent(fel)}` : ''}`, 303);
  }

  const orders = await listOrders();
  const status = (s) => (s === 'skickat' ? '<span class="ok">✓ skickat</span>' : `<span class="fel">${escapeHtml(s)}</span>`);
  const line = (r) => (r.text ? escapeHtml(r.text) : `${r.antal} × ${escapeHtml(r.namn)}${r.storlek ? ` (${escapeHtml(r.storlek)})` : ''}`);
  const rows = orders
    .map(
      (o) => `<tr>
  <td class="nr">${escapeHtml(o.nr)}<br><small>${escapeHtml(o.manuell ? when(o.skapad).slice(0, 10) : when(o.skapad))}</small></td>
  <td>${escapeHtml(o.namn)}${o.epost ? `<br><a href="mailto:${escapeHtml(o.epost)}">${escapeHtml(o.epost)}</a>` : ''}</td>
  <td><ul>${(o.rader ?? []).map((r) => `<li>${line(r)}</li>`).join('')}</ul></td>
  <td>${escapeHtml(o.namntryck)}</td>
  <td>${escapeHtml(o.info).replace(/\n/g, '<br>')}</td>
  <td class="sum">${kr(o.summa)}</td>
  <td>${o.manuell ? '<span class="manual">Manuellt inlagd</span>' : `Kund: ${status(o.mejl?.kund)}<br>Skolan: ${status(o.mejl?.skolan)}`}</td>
  <td><form method="post" onsubmit="return confirm('Radera order ${escapeHtml(o.nr)}? Det går inte att ångra.')"><input type="hidden" name="radera" value="${escapeHtml(o.nr)}"><button>Radera</button></form></td>
</tr>`,
    )
    .join('');

  const fel = url.searchParams.get('fel');
  const body = `<h1>Beställningar</h1>
<p>${orders.length} beställning${orders.length === 1 ? '' : 'ar'}, nyast först. Matcha Swish-betalningar mot ordernumret.</p>
${fel ? `<p class="msg">${escapeHtml(fel)}</p>` : ''}
<table><thead><tr><th>Order</th><th>Kund</th><th>Produkter</th><th>Namntryck</th><th>Övrig info</th><th>Summa</th><th>Mejl</th><th></th></tr></thead>
<tbody>${rows || '<tr><td colspan="8">Inga beställningar ännu.</td></tr>'}</tbody></table>
<details${fel ? ' open' : ''}><summary>Lägg till en order manuellt</summary>
<p>Till exempel en beställning som gjorts i receptionen, eller en från före 21 oktober 2026. Inga mejl skickas.</p>
<form method="post" class="add">
  <label>Ordernummer (lämna tomt för att skapa ett nytt) <input name="nr" placeholder="WDF-261020-8NVX"></label>
  <label>Datum <input name="datum" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
  <label>Kundens namn * <input name="namn" required></label>
  <label>Kundens e-post <input name="epost" type="email"></label>
  <label>Produkter * (en per rad, till exempel "1 × Junior Hoodie svart med zip (Junior: 150-160)") <textarea name="produkter" rows="3" required></textarea></label>
  <label>Namntryck <input name="namntryck"></label>
  <label>Övrig info <textarea name="info" rows="2"></textarea></label>
  <label>Summa (kr) <input name="summa" type="number" min="0" step="1"></label>
  <button type="submit">Lägg till</button>
</form></details>`;

  return respond(page('Beställningar – Wilson Dance Factory', body, style));
};

export const config = { path: ['/admin/bestallningar', '/admin/bestallningar/'] };
