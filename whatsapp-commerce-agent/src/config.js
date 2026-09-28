import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function loadConfig() {
  return {
    port: Number(process.env.PORT) || 3000,
    supabase: {
      url: required('SUPABASE_URL'),
      serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    },
    whatsapp: {
      accessToken: required('WHATSAPP_ACCESS_TOKEN'),
      phoneNumberId: required('WHATSAPP_PHONE_NUMBER_ID'),
      verifyToken: required('WHATSAPP_VERIFY_TOKEN'),
      // Optional but strongly recommended: verifies X-Hub-Signature-256 on inbound webhooks.
      appSecret: process.env.WHATSAPP_APP_SECRET || null,
      graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0',
    },
    paystack: {
      secretKey: required('PAYSTACK_SECRET_KEY'),
      callbackUrl: process.env.PAYSTACK_CALLBACK_URL || null,
      // Paystack requires a customer email; WhatsApp users rarely give one.
      placeholderEmailDomain: process.env.PAYSTACK_PLACEHOLDER_EMAIL_DOMAIN || 'customers.example.com',
    },
  };
}
