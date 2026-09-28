import crypto from 'node:crypto';

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** Meta signs the raw body with HMAC-SHA256 using the App Secret: "sha256=<hex>". */
export function verifyMetaSignature(rawBody, header, appSecret) {
  if (!rawBody || !header || !header.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return safeEqualHex(header.slice('sha256='.length), expected);
}

/** Paystack signs the raw body with HMAC-SHA512 using your secret key. */
export function verifyPaystackSignature(rawBody, header, secretKey) {
  if (!rawBody || !header) return false;
  const expected = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  return safeEqualHex(header, expected);
}
