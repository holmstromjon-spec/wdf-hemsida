// Where job applications are kept: Netlify Blobs (store "ansokningar").
// "<id>" holds the application as JSON, "<id>/fil-<n>" each attached file (CV etc.).
// Applications are deleted automatically 6 months after they came in (privacy policy):
// purgeExpired() runs daily (ansokningar-rensa.mjs) and whenever the list is opened.
// ORDER_STORE=memory (tests) keeps everything in memory instead.

import { getStore } from '@netlify/blobs';

export const KEEP_MONTHS = 6;
const memory = new Map();

function store() {
  if (process.env.ORDER_STORE === 'memory') {
    return {
      setJSON: async (key, value) => void memory.set(key, { data: structuredClone(value) }),
      set: async (key, data, { metadata } = {}) => void memory.set(key, { data, metadata }),
      get: async (key) => structuredClone(memory.get(key)?.data ?? null),
      getWithMetadata: async (key) => memory.get(key) ?? null,
      list: async () => ({ blobs: [...memory.keys()].map((key) => ({ key })) }),
      delete: async (key) => void memory.delete(key),
    };
  }
  return getStore({ name: 'ansokningar', consistency: 'strong' });
}

/** files: [{ namn, typ, data: ArrayBuffer }] – saved before any mail is sent. */
export async function saveApplication(application, files) {
  const s = store();
  for (const [n, f] of files.entries()) {
    await s.set(`${application.id}/fil-${n}`, f.data, { metadata: { namn: f.namn, typ: f.typ } });
  }
  await s.setJSON(application.id, { ...application, filer: files.map((f) => ({ namn: f.namn, typ: f.typ, storlek: f.data.byteLength })) });
}

export async function updateApplication(id, changes) {
  const s = store();
  const current = (await s.get(id, { type: 'json' })) ?? {};
  await s.setJSON(id, { ...current, ...changes });
}

export async function getFile(id, n) {
  const res = await store().getWithMetadata(`${id}/fil-${n}`, { type: 'arrayBuffer' });
  return res ? { data: res.data, ...res.metadata } : null;
}

export async function deleteApplication(id) {
  const s = store();
  const { blobs } = await s.list();
  await Promise.all(blobs.filter((b) => b.key === id || b.key.startsWith(`${id}/`)).map((b) => s.delete(b.key)));
}

export async function listApplications() {
  const s = store();
  const { blobs } = await s.list();
  const items = await Promise.all(blobs.filter((b) => !b.key.includes('/')).map((b) => s.get(b.key, { type: 'json' })));
  return items.filter(Boolean).sort((a, b) => String(b.skapad).localeCompare(String(a.skapad)));
}

/** Deletes every application (and its files) older than KEEP_MONTHS. Returns how many. */
export async function purgeExpired(now = new Date()) {
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - KEEP_MONTHS);
  const old = (await listApplications()).filter((a) => new Date(a.skapad) < limit);
  for (const a of old) await deleteApplication(a.id);
  return old.length;
}
