import { Router } from 'express';
import { verifyMetaSignature } from '../lib/signature.js';
import { SERVICE_ROW_PREFIX, formatMoney } from '../services/whatsapp.js';
import { generateReference } from '../services/paystack.js';

const GREETING = /^\s*hello\b/i;

/** Flattens Meta's entry[].changes[].value envelope into individual messages. */
function extractMessages(payload) {
  const out = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const contacts = value.contacts ?? [];
      for (const message of value.messages ?? []) {
        const contact = contacts.find((c) => c.wa_id === message.from);
        out.push({ message, profileName: contact?.profile?.name });
      }
    }
  }
  return out;
}

export function createWhatsAppWebhookRouter({ config, db, whatsapp, paystack, logger = console }) {
  const router = Router();

  // Meta's one-time verification handshake when you register the callback URL
  router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  router.post('/', (req, res) => {
    if (config.whatsapp.appSecret) {
      const ok = verifyMetaSignature(req.rawBody, req.get('x-hub-signature-256'), config.whatsapp.appSecret);
      if (!ok) return res.sendStatus(401);
    }

    // Ack immediately: Meta retries if we don't answer fast, which would cause duplicate replies.
    res.sendStatus(200);

    const messages = extractMessages(req.body);
    for (const item of messages) {
      handleMessage(item).catch((err) => logger.error('[whatsapp] failed to handle message:', err));
    }
  });

  async function handleMessage({ message, profileName }) {
    const from = message.from;

    if (message.type === 'text' && GREETING.test(message.text?.body ?? '')) {
      await db.upsertUser({ phone: from, name: profileName });
      return sendMenu(from);
    }

    if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
      const rowId = message.interactive.list_reply.id ?? '';
      if (rowId.startsWith(SERVICE_ROW_PREFIX)) {
        return handleServiceSelection(from, profileName, rowId.slice(SERVICE_ROW_PREFIX.length));
      }
    }

    // Anything else: nudge the user towards the entry point
    await whatsapp.sendText(from, 'Say *Hello* to see our list of services. 🙂');
  }

  async function sendMenu(to) {
    const services = await db.listActiveServices();
    if (!services.length) {
      return whatsapp.sendText(to, 'Sorry, no services are available right now. Please check back later.');
    }
    return whatsapp.sendServicesList(to, services);
  }

  async function handleServiceSelection(from, profileName, serviceId) {
    const [user, service] = await Promise.all([
      db.upsertUser({ phone: from, name: profileName }),
      db.getService(serviceId),
    ]);

    if (!service) {
      await whatsapp.sendText(from, 'That service is no longer available. Here is the current list:');
      return sendMenu(from);
    }

    const reference = generateReference();
    const email = user.email || `${from}@${config.paystack.placeholderEmailDomain}`;

    // 1. Initialize the Paystack transaction
    let transaction;
    try {
      transaction = await paystack.initializeTransaction({
        email,
        amount: service.price,
        currency: service.currency,
        reference,
        metadata: { whatsapp_phone: from, user_id: user.id, service_id: service.id },
      });
    } catch (err) {
      logger.error('[paystack] initialize failed:', err);
      return whatsapp.sendText(from, 'Sorry, we couldn\'t create your payment link. Please try again shortly.');
    }

    // 2. Save the booking as pending
    await db.createBooking({
      user_id: user.id,
      service_id: service.id,
      status: 'pending',
      amount: service.price,
      currency: service.currency,
      paystack_reference: transaction.reference,
      payment_url: transaction.authorization_url,
    });

    // 3. Send the payment link back on WhatsApp
    await whatsapp.sendText(
      from,
      `Great choice! 🎉\n\n*${service.name}* — ${formatMoney(service.price, service.currency)}\n\n` +
        `Tap the link below to pay securely with Paystack:\n${transaction.authorization_url}\n\n` +
        `Reference: ${transaction.reference}`,
    );
  }

  return router;
}
