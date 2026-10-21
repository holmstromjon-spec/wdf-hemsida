// Shared bits for the password-protected pages under /admin/.
// The browser asks for a username and password: any username, and the password in the
// environment variable ADMIN_PASSWORD (ORDERS_PASSWORD, the older name, also works).

export const adminPassword = () => process.env.ADMIN_PASSWORD || process.env.ORDERS_PASSWORD || '';

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function authorized(req) {
  const password = adminPassword();
  if (!password) return false;
  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  return decoded.slice(decoded.indexOf(':') + 1) === password;
}

const html = (body, status = 200, extra = {}) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extra },
  });

/** Returns a Response if the request may not continue (not set up, or not logged in). */
export function guard(req, title) {
  if (!adminPassword()) {
    return html(page(title, `<h1>${title}</h1><p>Sidan är inte aktiverad (ADMIN_PASSWORD saknas i Netlify).</p>`), 503);
  }
  if (!authorized(req)) {
    return new Response('Inloggning krävs', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Wilson Dance Factory - admin", charset="UTF-8"', 'X-Robots-Tag': 'noindex' },
    });
  }
  return null;
}

export const respond = html;

const nav = `<nav><a href="/admin/schema/">Schema</a><a href="/admin/bestallningar/">Beställningar</a><a href="/">Till hemsidan</a></nav>`;

export const page = (title, body, style = '') => `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;padding:1.5rem;color:#201f1f;background:#f4f3f3;line-height:1.45}
  nav{display:flex;gap:1.25rem;margin-bottom:1.25rem;font-size:.9rem} nav a{color:#5d5b5b}
  h1{font-weight:400;margin:0 0 .25rem} p{margin:.25rem 0 1rem;color:#5d5b5b}
  table{width:100%;border-collapse:collapse;background:#fff;font-size:.9rem}
  th,td{text-align:left;vertical-align:top;padding:.6rem .7rem;border-bottom:1px solid #e2e0e0}
  th{background:#201f1f;color:#fff;font-weight:500}
  .ok{color:#1d7a3a} .fel{color:#c42a20;font-weight:600}
  ${style}
</style></head><body>${nav}${body}</body></html>`;
