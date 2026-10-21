// /admin/ansokningar/ – job applications from /jobba-hos-oss/, newest first, with their files,
// behind the admin password (netlify/lib/admin.mjs). Applications are deleted automatically
// after 6 months, and can be deleted by hand earlier.

import { deleteApplication, getFile, listApplications, purgeExpired, KEEP_MONTHS } from '../lib/applications.mjs';
import { escapeHtml, guard, page, respond } from '../lib/admin.mjs';

const TITLE = 'Jobbansökningar';
const when = (iso) =>
  new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' });
const kb = (n) => `${Math.max(1, Math.round(n / 1024)).toLocaleString('sv-SE')} kB`;

const style = `th{position:sticky;top:0} .nr{font-weight:600;white-space:nowrap} td p{margin:0 0 .4rem;color:#201f1f}
  ul{margin:0;padding-left:1.1rem} button{font:inherit;background:none;border:1px solid #c42a20;color:#c42a20;border-radius:4px;padding:.25rem .6rem;cursor:pointer}`;

export default async (req) => {
  const stop = guard(req, TITLE);
  if (stop) return stop;
  const url = new URL(req.url);

  if (req.method === 'POST') {
    const from = req.headers.get('origin');
    if (from && from !== url.origin) return respond('Fel ursprung', 403);
    const id = String((await req.formData()).get('radera') ?? '');
    if (/^JOBB-\d{6}-[A-Z0-9]{4}$/.test(id)) await deleteApplication(id);
    return Response.redirect(`${url.origin}/admin/ansokningar/`, 303);
  }

  const fileId = url.searchParams.get('fil');
  if (fileId) {
    const file = await getFile(fileId, Number(url.searchParams.get('n') ?? 0));
    if (!file) return respond('Filen finns inte (ansökan kan vara raderad).', 404);
    return new Response(file.data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.namn)}`,
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  await purgeExpired();
  const apps = await listApplications();
  const status = (s) => (s === 'skickat' ? '<span class="ok">✓ skickat</span>' : `<span class="fel">${escapeHtml(s)}</span>`);
  const text = (label, v) => (v ? `<p><strong>${label}:</strong> ${escapeHtml(v).replace(/\n/g, '<br>')}</p>` : '');
  const rows = apps
    .map(
      (a) => `<tr>
  <td class="nr">${escapeHtml(a.id)}<br><small>${escapeHtml(when(a.skapad))}</small></td>
  <td>${escapeHtml(a.namn)}<br><a href="mailto:${escapeHtml(a.epost)}">${escapeHtml(a.epost)}</a>${a.telefon ? `<br>${escapeHtml(a.telefon)}` : ''}${a.alder ? `<br>Ålder: ${escapeHtml(a.alder)}` : ''}</td>
  <td>${text('Erfarenhet', a.erfarenhet)}${text('Motivering', a.motivering)}</td>
  <td>${(a.filer ?? []).length ? `<ul>${a.filer.map((f, n) => `<li><a href="?fil=${encodeURIComponent(a.id)}&n=${n}">${escapeHtml(f.namn)}</a> (${kb(f.storlek)})</li>`).join('')}</ul>` : '–'}</td>
  <td>Skolan: ${status(a.mejl?.skolan)}<br>Sökande: ${status(a.mejl?.sokande)}</td>
  <td><form method="post" onsubmit="return confirm('Radera ansökan från ${escapeHtml(a.namn).replace(/'/g, '')} för gott?')"><input type="hidden" name="radera" value="${escapeHtml(a.id)}"><button>Radera</button></form></td>
</tr>`,
    )
    .join('');

  const body = `<h1>${TITLE}</h1>
<p>${apps.length} ansökning${apps.length === 1 ? '' : 'ar'}, nyast först. Ansökningar raderas automatiskt efter ${KEEP_MONTHS} månader. Radera gärna tidigare när rekryteringen är klar.</p>
<table><thead><tr><th>Ansökan</th><th>Sökande</th><th>Erfarenhet och motivering</th><th>Bilagor</th><th>Mejl</th><th></th></tr></thead>
<tbody>${rows || '<tr><td colspan="6">Inga ansökningar just nu.</td></tr>'}</tbody></table>`;

  return respond(page(`${TITLE} – Wilson Dance Factory`, body, style));
};

export const config = { path: ['/admin/ansokningar', '/admin/ansokningar/'] };
