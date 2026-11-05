// Swish payment for a saved shop order, always with the amount from the saved order (never
// from the URL):
//   /swish/qr?order=WDF-…      the prefilled QR code (PNG), shown on the thank-you page
//   /swish/betala?order=WDF-…  redirects to the Swish app with everything filled in (phones);
//                              the "Betala med Swish" button in the confirmation mail links here,
//                              because mail programs do not keep swish:// links.

import { getOrder } from '../lib/orders.mjs';
import { appLink, qrPng } from '../lib/swish.mjs';

const ORDER_NR = /^WDF-\d{6}-[A-Z0-9]{4}$/;
const text = (status, body) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

export default async (req) => {
  const url = new URL(req.url);
  const nr = String(url.searchParams.get('order') ?? '').toUpperCase();
  if (!ORDER_NR.test(nr)) return text(400, 'Ogiltigt ordernummer.');
  const order = await getOrder(nr).catch(() => null);
  if (!order || !(order.summa > 0)) return text(404, 'Ordern finns inte.');

  let butik;
  try {
    butik = await (await fetch(new URL('/butik.json', req.url))).json();
  } catch {
    return text(502, 'Försök igen om en stund.');
  }

  if (url.pathname.startsWith('/swish/qr')) {
    const png = await qrPng(butik.swish, order.summa, nr);
    if (!png) return text(502, 'Swish QR-kod kunde inte skapas.');
    return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' } });
  }
  return new Response(null, { status: 302, headers: { Location: appLink(butik.swish, order.summa, nr), 'Cache-Control': 'no-store' } });
};

export const config = { path: ['/swish/qr', '/swish/betala'] };
