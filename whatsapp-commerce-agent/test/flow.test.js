import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createApp } from '../src/app.js';
import { buildServicesList } from '../src/services/whatsapp.js';

const config = {
  whatsapp: { verifyToken: 'verify-me', appSecret: 'meta-secret' },
  paystack: { secretKey: 'sk_test_123', placeholderEmailDomain: 'customers.example.com' },
};

// ---- in-memory fakes ------------------------------------------------------
const state = { users: [], bookings: [], sent: [], initialized: [] };
const services = [
  { id: 'svc-1', name: 'Haircut', description: 'Classic cut', price: 5000, currency: 'NGN' },
  { id: 'svc-2', name: 'Beard Trim', description: 'Shape-up', price: 2500, currency: 'NGN' },
];

const db = {
  async upsertUser({ phone, name }) {
    let u = state.users.find((x) => x.phone === phone);
    if (!u) state.users.push((u = { id: `user-${phone}`, phone, name, email: null }));
    else if (name) u.name = name;
    return u;
  },
  listActiveServices: async () => services,
  getService: async (id) => services.find((s) => s.id === id) ?? null,
  async createBooking(b) {
    const row = { id: `bk-${state.bookings.length + 1}`, ...b };
    state.bookings.push(row);
    return row;
  },
  async getBookingByReference(ref) {
    const b = state.bookings.find((x) => x.paystack_reference === ref);
    if (!b) return null;
    return {
      ...b,
      users: state.users.find((u) => u.id === b.user_id),
      services: services.find((s) => s.id === b.service_id),
    };
  },
  async markBookingPaid(ref, paidAt) {
    const b = state.bookings.find((x) => x.paystack_reference === ref && x.status === 'pending');
    if (!b) return null;
    Object.assign(b, { status: 'paid', paid_at: paidAt });
    return b;
  },
};

const whatsapp = {
  sendText: async (to, text) => state.sent.push({ to, type: 'text', text }),
  sendServicesList: async (to, svcs) => state.sent.push({ to, type: 'list', list: buildServicesList(svcs) }),
};

const paystack = {
  async initializeTransaction(args) {
    state.initialized.push(args);
    return { authorization_url: `https://checkout.paystack.com/${args.reference}`, reference: args.reference };
  },
  verifyTransaction: async () => ({ status: 'success', amount: 500000, paid_at: '2026-01-01T00:00:00Z' }),
};

const logger = { error: (...a) => console.error(...a), warn: () => {} };

// ---- helpers ----------------------------------------------------------------
let server, base;
before(async () => {
  server = createApp({ config, db, whatsapp, paystack, logger }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const tick = () => new Promise((r) => setTimeout(r, 20));

function postSigned(path, payload, header, sign) {
  const body = JSON.stringify(payload);
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [header]: sign(body) },
    body,
  });
}
const metaSig = (body) => `sha256=${crypto.createHmac('sha256', config.whatsapp.appSecret).update(body).digest('hex')}`;
const paystackSig = (body) => crypto.createHmac('sha512', config.paystack.secretKey).update(body).digest('hex');

const waEnvelope = (message) => ({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ value: { contacts: [{ wa_id: message.from, profile: { name: 'Ada' } }], messages: [message] } }] }],
});

// ---- tests ------------------------------------------------------------------
test('GET verification handshake', async () => {
  const ok = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42`);
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), '42');
  const bad = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42`);
  assert.equal(bad.status, 403);
});

test('rejects unsigned webhooks', async () => {
  const wa = await postSigned('/webhooks/whatsapp', {}, 'x-hub-signature-256', () => 'sha256=00');
  assert.equal(wa.status, 401);
  const ps = await postSigned('/webhooks/paystack', {}, 'x-paystack-signature', () => 'bad');
  assert.equal(ps.status, 401);
});

test('Hello -> list -> select -> pending booking + link -> charge.success -> paid + confirmation', async () => {
  const phone = '2348012345678';

  // 1. User says hello
  let res = await postSigned('/webhooks/whatsapp',
    waEnvelope({ from: phone, id: 'm1', type: 'text', text: { body: 'Hello' } }), 'x-hub-signature-256', metaSig);
  assert.equal(res.status, 200);
  await tick();
  const list = state.sent.at(-1);
  assert.equal(list.type, 'list');
  assert.equal(list.list.type, 'list');
  assert.deepEqual(list.list.action.sections[0].rows.map((r) => r.id), ['service:svc-1', 'service:svc-2']);

  // 2. User picks "Haircut"
  res = await postSigned('/webhooks/whatsapp', waEnvelope({
    from: phone, id: 'm2', type: 'interactive',
    interactive: { type: 'list_reply', list_reply: { id: 'service:svc-1', title: 'Haircut' } },
  }), 'x-hub-signature-256', metaSig);
  assert.equal(res.status, 200);
  await tick();

  assert.equal(state.initialized.length, 1);
  assert.equal(state.initialized[0].amount, 5000);
  assert.equal(state.initialized[0].email, `${phone}@customers.example.com`);
  const booking = state.bookings[0];
  assert.equal(booking.status, 'pending');
  const linkMsg = state.sent.at(-1);
  assert.match(linkMsg.text, /https:\/\/checkout\.paystack\.com\//);

  // 3. Paystack fires charge.success (twice, to check idempotency)
  const event = { event: 'charge.success', data: { reference: booking.paystack_reference, amount: 500000 } };
  for (let i = 0; i < 2; i++) {
    res = await postSigned('/webhooks/paystack', event, 'x-paystack-signature', paystackSig);
    assert.equal(res.status, 200);
    await tick();
  }

  assert.equal(booking.status, 'paid');
  const confirmations = state.sent.filter((m) => m.to === phone && /Payment received/.test(m.text ?? ''));
  assert.equal(confirmations.length, 1);
});
