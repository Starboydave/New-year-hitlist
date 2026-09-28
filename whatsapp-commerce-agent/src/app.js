import express from 'express';
import { createWhatsAppWebhookRouter } from './routes/whatsappWebhook.js';
import { createPaystackWebhookRouter } from './routes/paystackWebhook.js';

/** Builds the Express app. Dependencies are injected so tests can use fakes. */
export function createApp(deps) {
  const app = express();

  // Keep the raw bytes: both Meta and Paystack sign the exact request body.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/webhooks/whatsapp', createWhatsAppWebhookRouter(deps));
  app.use('/webhooks/paystack', createPaystackWebhookRouter(deps));

  return app;
}
