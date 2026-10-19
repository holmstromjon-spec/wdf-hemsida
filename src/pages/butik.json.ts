// Published at /butik.json. The order function reads products, prices and sizes from here,
// so prices are never taken from what the browser sends.
import type { APIRoute } from 'astro';
import { butik, site } from '../lib/data';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      oppen: butik.oppen,
      namntryck_max: butik.namntryck_max,
      produkter: butik.produkter.map(({ id, namn, pris, storlek }) => ({ id, namn, pris, storlek })),
      storlekar: butik.storlekar,
      swish: site.swish,
      epost: site.epost,
      telefon: site.telefon,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
