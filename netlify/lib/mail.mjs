// Sends one mail through Resend. ORDER_DRY_RUN=1 logs it instead (tests, local runs).

export async function send(mail) {
  if (process.env.ORDER_DRY_RUN === '1') {
    console.log('[ORDER_DRY_RUN]', JSON.stringify(mail, null, 2));
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mail),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Sends and returns "skickat" or "misslyckades: …", so a failed mail never stops the caller. */
export async function sendStatus(mail) {
  try {
    await send(mail);
    return 'skickat';
  } catch (err) {
    console.error(`Mail to ${mail.to.join(', ')} failed`, err);
    return `misslyckades: ${String(err.message).slice(0, 200)}`;
  }
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
