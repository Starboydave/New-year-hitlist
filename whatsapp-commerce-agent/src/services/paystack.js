import crypto from 'node:crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/** Paystack amounts are in the currency's subunit (kobo for NGN). */
export const toSubunit = (amount) => Math.round(Number(amount) * 100);

export function generateReference() {
  return `wa_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

export function createPaystackClient({ secretKey, callbackUrl }) {
  async function request(method, path, body) {
    const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== true) {
      throw new Error(`Paystack ${method} ${path} failed (${res.status}): ${json.message || 'unknown error'}`);
    }
    return json.data;
  }

  return {
    /** POST /transaction/initialize — returns { authorization_url, access_code, reference }. */
    initializeTransaction({ email, amount, currency, reference, metadata }) {
      return request('POST', '/transaction/initialize', {
        email,
        amount: toSubunit(amount),
        currency,
        reference,
        metadata,
        ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      });
    },

    /** GET /transaction/verify/:reference — used to double-check webhook events. */
    verifyTransaction(reference) {
      return request('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
    },
  };
}
