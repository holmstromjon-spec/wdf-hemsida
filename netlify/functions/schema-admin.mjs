// /admin/schema/ – staff update the schedule themselves:
// 1. edit the tab "Hemsida schema" in the Google Sheet,
// 2. open this page: it shows the schedule exactly as the next build will read it, any errors,
//    and what differs from what is on the site now (/schema.json),
// 3. click Publicera: this starts a Netlify build via the build hook in SCHEMA_BUILD_HOOK.
// Behind the admin password (netlify/lib/admin.mjs).

import { fetchSchedule, scheduleLines, SHEET_VIEW_URL } from '../../src/lib/schema-sheet.mjs';
import { escapeHtml, guard, page, respond } from '../lib/admin.mjs';

const TITLE = 'Schema';
const time = (d = new Date()) => d.toLocaleTimeString('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' });

const style = `
  .box{background:#fff;border-left:4px solid #201f1f;padding:1rem 1.25rem;margin:0 0 1.5rem;max-width:48rem}
  .box.bad{border-color:#c42a20} .box.good{border-color:#1d7a3a} .box p{color:#201f1f}
  .box ol,.box ul{margin:.25rem 0 .5rem;padding-left:1.3rem}
  button{font:inherit;font-weight:600;background:#c42a20;color:#fff;border:0;border-radius:4px;padding:.75rem 1.4rem;cursor:pointer}
  button[disabled]{background:#9a9898;cursor:not-allowed}
  .add{color:#1d7a3a} .del{color:#c42a20;text-decoration:line-through}
  h2{font-weight:500;margin:2rem 0 .75rem} h3{margin:1.25rem 0 .4rem;font-size:1rem}
  .groups{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr))}
  .group{background:#fff;padding:.25rem 1rem 1rem} .group table{font-size:.85rem}
  .group td{padding:.3rem .4rem} .group td:first-child{white-space:nowrap;color:#5d5b5b;width:7.5rem}
  .day{font-weight:600;padding:.6rem .4rem .2rem}`;

async function publishedLines(origin) {
  try {
    const res = await fetch(`${origin}/schema.json`, { signal: AbortSignal.timeout(5000) });
    const live = await res.json();
    return scheduleLines({ veckoschema: live.veckoschema.grupper, tavlingsschema: live.tavlingsschema.grupper });
  } catch {
    return null;
  }
}

async function readSheet() {
  try {
    return await fetchSchedule(undefined, { timeoutMs: 8000 });
  } catch (err) {
    return { veckoschema: [], tavlingsschema: [], fel: [`Kunde inte hämta Google-arket: ${err.message}`] };
  }
}

const preview = (label, grupper) => `<h2>${label}</h2><div class="groups">${grupper
  .map(
    (g) => `<section class="group"><h3>${escapeHtml(g.namn)}</h3><table>${g.dagar
      .map(
        (d) => `<tr><td colspan="2" class="day">${escapeHtml(d.dag)}</td></tr>${d.pass
          .map((p) => `<tr><td>${escapeHtml(p.tid)}</td><td>${escapeHtml(p.klass)}</td></tr>`)
          .join('')}`,
      )
      .join('')}</table></section>`,
  )
  .join('')}</div>`;

const howTo = `<div class="box"><p><strong>Så uppdaterar du schemat</strong></p><ol>
<li>Ändra i fliken <em>Hemsida schema</em> i Google-arket. Behåll uppställningen: grupprubrik, veckodag, och sedan tid till vänster och klass till höger.</li>
<li>Vänta cirka 5 minuter. Google uppdaterar den publicerade versionen av arket med en liten fördröjning.</li>
<li>Ladda om den här sidan och kontrollera förhandsvisningen nedan.</li>
<li>Klicka <strong>Publicera</strong>. Hemsidan är uppdaterad efter ett par minuter.</li>
</ol><p><a href="${escapeHtml(SHEET_VIEW_URL)}" target="_blank" rel="noopener">Visa den publicerade versionen av arket</a></p></div>`;

export default async (req) => {
  const stop = guard(req, TITLE);
  if (stop) return stop;
  const url = new URL(req.url);

  if (req.method === 'POST') {
    const from = req.headers.get('origin');
    if (from && from !== url.origin) return respond('Fel ursprung', 403);
    const sheet = await readSheet();
    if (sheet.fel.length) return Response.redirect(`${url.origin}/admin/schema/`, 303);
    const hook = process.env.SCHEMA_BUILD_HOOK;
    if (!hook) return respond(page(TITLE, `<h1>${TITLE}</h1><div class="box bad"><p>Publicering är inte aktiverad (SCHEMA_BUILD_HOOK saknas i Netlify).</p></div>`, style), 503);
    const res = await fetch(`${hook}?trigger_title=${encodeURIComponent('Schemat publicerat via /admin/schema')}`, { method: 'POST' });
    if (!res.ok) {
      return respond(page(TITLE, `<h1>${TITLE}</h1><div class="box bad"><p>Netlify tog inte emot publiceringen (svar ${res.status}). Försök igen om en stund.</p></div>`, style), 502);
    }
    return Response.redirect(`${url.origin}/admin/schema/?publicerat=${encodeURIComponent(time())}`, 303);
  }
  if (req.method !== 'GET') return respond('Metoden stöds inte', 405);

  const [sheet, live] = await Promise.all([readSheet(), publishedLines(url.origin)]);
  const ok = !sheet.fel.length;
  const published = url.searchParams.get('publicerat');
  const parts = [`<h1>${TITLE}</h1><p>Förhandsvisning av schemat som det står i Google-arket just nu (hämtat ${time()}).</p>`];

  if (published) {
    parts.push(`<div class="box good"><p><strong>Publiceringen startades kl. ${escapeHtml(published)}.</strong> Hemsidan är uppdaterad om ett par minuter. Ladda om den här sidan efter det: då ska listan över ändringar vara tom.</p></div>`);
  }

  if (!ok) {
    parts.push(`<div class="box bad"><p><strong>Arket kan inte publiceras ännu.</strong> Rätta följande i Google-arket, vänta några minuter och ladda om sidan:</p><ul>${sheet.fel
      .map((f) => `<li>${escapeHtml(f)}</li>`)
      .join('')}</ul><p>Hemsidan visar det tidigare schemat tills dess.</p></div>`);
  } else {
    const next = scheduleLines(sheet);
    let changes;
    if (!live) changes = '<p>Kunde inte läsa schemat som ligger på hemsidan nu, så ändringarna kan inte visas. Kontrollera förhandsvisningen nedan.</p>';
    else {
      const added = next.filter((l) => !live.includes(l));
      const removed = live.filter((l) => !next.includes(l));
      changes = added.length || removed.length
        ? `<p><strong>Ändringar jämfört med hemsidan (${added.length} nya eller ändrade rader, ${removed.length} borttagna):</strong></p><ul>${[
            ...removed.map((l) => `<li class="del">${escapeHtml(l)}</li>`),
            ...added.map((l) => `<li class="add">${escapeHtml(l)}</li>`),
          ].join('')}</ul>`
        : '<p><strong>Inga ändringar.</strong> Hemsidan visar redan det här schemat.</p>';
    }
    parts.push(`<div class="box good"><p class="ok"><strong>✓ Arket går att läsa.</strong> ${next.length} pass i ${sheet.veckoschema.length + sheet.tavlingsschema.length} grupper.</p>${changes}
<form method="post"><button type="submit">Publicera</button></form></div>`);
  }

  parts.push(howTo);
  if (ok) parts.push(preview('Veckoschema', sheet.veckoschema), preview('Tävlingsschema', sheet.tavlingsschema));
  return respond(page('Schema – Wilson Dance Factory', parts.join('\n'), style));
};

export const config = { path: ['/admin/schema', '/admin/schema/'] };
