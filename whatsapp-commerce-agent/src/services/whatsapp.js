// WhatsApp Cloud API limits for interactive list messages
const LIST_MAX_ROWS = 10;
const ROW_TITLE_MAX = 24;
const ROW_DESCRIPTION_MAX = 72;

export const SERVICE_ROW_PREFIX = 'service:';

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function formatMoney(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(Number(amount));
}

/** Builds the `interactive` payload for the services menu. */
export function buildServicesList(services) {
  const rows = services.slice(0, LIST_MAX_ROWS).map((s) => ({
    id: `${SERVICE_ROW_PREFIX}${s.id}`,
    title: truncate(s.name, ROW_TITLE_MAX),
    description: truncate(
      [formatMoney(s.price, s.currency), s.description].filter(Boolean).join(' · '),
      ROW_DESCRIPTION_MAX,
    ),
  }));

  return {
    type: 'list',
    header: { type: 'text', text: 'Our Services' },
    body: { text: 'Hi there! 👋 Pick a service below and we\'ll send you a secure payment link.' },
    footer: { text: 'Payments powered by Paystack' },
    action: {
      button: 'View services',
      sections: [{ title: 'Available services', rows }],
    },
  };
}

export function createWhatsAppClient({ accessToken, phoneNumberId, graphApiVersion }) {
  const endpoint = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;

  async function send(to, message) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, ...message }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`WhatsApp API ${res.status}: ${body?.error?.message || JSON.stringify(body)}`);
    }
    return body;
  }

  return {
    sendText(to, text) {
      return send(to, { type: 'text', text: { body: text, preview_url: true } });
    },
    sendServicesList(to, services) {
      return send(to, { type: 'interactive', interactive: buildServicesList(services) });
    },
  };
}
