// Prefilled Swish payments for shop orders: the payee, the amount and the order number (as the
// message) are filled in and locked, so the customer only has to approve the payment.
//   - qrPng(): Swish's own QR generator (the official, Swish-branded code). The code holds
//     "C<number>;<amount>;<message>;0", where 0 means that nothing can be edited in the app.
//   - appLink(): swish://payment?data=…, which opens the Swish app on a phone with the same data.
// Used by order.mjs (QR code in the confirmation mail) and functions/swish.mjs (/swish/qr and
// /swish/betala, used by the mail button and by the thank-you page).

const QR_API = 'https://mpc.getswish.net/qrg-swish/api/v1/prefilled';

/** "123 453 16 04" → "1234531604" */
export const swishNumber = (s) => String(s).replace(/\D/g, '');

const fields = (payee, amount, message) => ({
  payee: { value: swishNumber(payee), editable: false },
  amount: { value: amount, editable: false },
  message: { value: message, editable: false },
});

/** PNG (Buffer) of the prefilled QR code, or null if Swish's service does not answer. */
export async function qrPng(payee, amount, message, { size = 300, timeoutMs = 5000 } = {}) {
  try {
    const res = await fetch(QR_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'png', size,...fields(payee, amount, message) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Swish QR ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error('Swish QR code could not be created', err);
    return null;
  }
}

export const appLink = (payee, amount, message) =>
  `swish://payment?data=${encodeURIComponent(JSON.stringify({ version: 1, ...fields(payee, amount, message) }))}`;
