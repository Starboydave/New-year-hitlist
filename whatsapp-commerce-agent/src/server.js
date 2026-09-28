import { loadConfig } from './config.js';
import { createDb } from './lib/db.js';
import { createWhatsAppClient } from './services/whatsapp.js';
import { createPaystackClient } from './services/paystack.js';
import { createApp } from './app.js';

const config = loadConfig();

if (!config.whatsapp.appSecret) {
  console.warn('[warn] WHATSAPP_APP_SECRET is not set — inbound WhatsApp webhooks will not be signature-verified.');
}

const app = createApp({
  config,
  db: createDb(config.supabase),
  whatsapp: createWhatsAppClient(config.whatsapp),
  paystack: createPaystackClient(config.paystack),
});

app.listen(config.port, () => {
  console.log(`WhatsApp commerce agent listening on :${config.port}`);
  console.log(`  WhatsApp webhook: POST/GET /webhooks/whatsapp`);
  console.log(`  Paystack webhook: POST     /webhooks/paystack`);
});
