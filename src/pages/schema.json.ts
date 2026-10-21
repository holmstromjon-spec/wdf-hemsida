// /schema.json – the schedule as it was published in this build. Used by the next build as
// a fallback if Google does not answer, and by /admin/schema/ to show what has changed.
import type { APIRoute } from 'astro';
import { schema } from '../lib/data';

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ...schema, byggd: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
