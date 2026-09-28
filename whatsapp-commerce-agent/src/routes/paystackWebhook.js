import { Router } from 'express';
import { verifyPaystackSignature } from '../lib/signature.js';
import { formatMoney } from '../services/whatsapp.js';
import { toSubunit } from '../services/paystack.js';

export function createPaystackWebhookRouter({ config, db, whatsapp, paystack, logger = console }) {
  const router = Router();

  router.post('/', (req, res) => {
    const ok = verifyPaystackSignature(req.rawBody, req.get('x-paystack-signature'), config.paystack.secretKey);
    if (!ok) return res.sendStatus(401);

    // Paystack expects a quick 200; process afterwards.
    res.sendStatus(200);

    const { event, data } = req.body ?? {};
    if (event !== 'charge.success') return;

    handleChargeSuccess(data).catch((err) => logger.error('[paystack] failed to handle charge.success:', err));
  });

  async function handleChargeSuccess(data) {
    const reference = data?.reference;
    if (!reference) return;

    const booking = await db.getBookingByReference(reference);
    if (!booking) {
      logger.warn(`[paystack] charge.success for unknown reference ${reference}`);
      return;
    }

    // Defence in depth: confirm with Paystack directly and check the amount paid.
    const verified = await paystack.verifyTransaction(reference);
    if (verified.status !== 'success' || verified.amount < toSubunit(booking.amount)) {
      logger.warn(`[paystack] verification mismatch for ${reference}`, {
        status: verified.status,
        amount: verified.amount,
      });
      return;
    }

    const updated = await db.markBookingPaid(reference, verified.paid_at || data.paid_at || new Date().toISOString());
    if (!updated) return; // already paid — duplicate webhook delivery, don't notify twice

    const phone = booking.users?.phone;
    if (!phone) return;

    await whatsapp.sendText(
      phone,
      `✅ Payment received — thank you${booking.users?.name ? `, ${booking.users.name}` : ''}!\n\n` +
        `Your booking for *${booking.services?.name ?? 'your service'}* ` +
        `(${formatMoney(booking.amount, booking.currency)}) is confirmed.\n\n` +
        `Reference: ${reference}`,
    );
  }

  return router;
}
