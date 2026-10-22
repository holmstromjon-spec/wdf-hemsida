// Where shop orders are kept: Netlify Blobs (store "orders", one JSON per order number).
// Every order is saved here *before* any mail is sent, so an order can never be lost to a
// spam filter. The list is shown at /admin/bestallningar/.
// ORDER_STORE=memory (tests) keeps orders in memory instead.

import { getStore } from '@netlify/blobs';

const memory = new Map();

function store() {
  if (process.env.ORDER_STORE === 'memory') {
    return {
      setJSON: async (key, value) => void memory.set(key, structuredClone(value)),
      get: async (key) => structuredClone(memory.get(key) ?? null),
      list: async () => ({ blobs: [...memory.keys()].map((key) => ({ key })) }),
      delete: async (key) => void memory.delete(key),
    };
  }
  return getStore({ name: 'orders', consistency: 'strong' });
}

export async function saveOrder(order) {
  await store().setJSON(order.nr, order);
}

export async function updateOrder(nr, changes) {
  const s = store();
  const current = (await s.get(nr, { type: 'json' })) ?? {};
  await s.setJSON(nr, { ...current, ...changes });
}

export async function getOrder(nr) {
  return store().get(nr, { type: 'json' });
}

export async function deleteOrder(nr) {
  await store().delete(nr);
}

export async function listOrders() {
  const s = store();
  const { blobs } = await s.list();
  const orders = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })));
  return orders.filter(Boolean).sort((a, b) => String(b.skapad).localeCompare(String(a.skapad)));
}
