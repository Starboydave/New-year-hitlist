# WhatsApp Conversational Commerce Agent

Express server that sells services over WhatsApp and takes payment with Paystack.

```
Customer: "Hello"
Bot:      [Interactive list of services from Supabase]
Customer: taps "Haircut"
Bot:      Paystack payment link   (booking saved as `pending`)
Customer: pays
Paystack: charge.success webhook  -> booking set to `paid`
Bot:      "✅ Payment received ... your booking is confirmed"
```

## Setup

1. **Database**: run `supabase/schema.sql` in the Supabase SQL editor. It creates `users`, `services`, `bookings` (status enum `pending | paid`) and seeds three sample services.
2. **Env**: `cp .env.example .env` and fill in the values.
3. **Run**: `npm install && npm start` (or `npm run dev` for auto-reload).
4. **Expose it** for local testing, e.g. `ngrok http 3000`.
5. **Meta**: in your app, go to WhatsApp → Configuration → Webhook. Set the callback URL to `https://<host>/webhooks/whatsapp`, the verify token to `WHATSAPP_VERIFY_TOKEN`, and subscribe to the `messages` field.
6. **Paystack**: under Settings → API Keys & Webhooks, set the webhook URL to `https://<host>/webhooks/paystack`.

## Routes

| Method | Path                 | Purpose                                                      |
|--------|----------------------|--------------------------------------------------------------|
| GET    | `/webhooks/whatsapp` | Meta verification handshake (`hub.challenge`)                |
| POST   | `/webhooks/whatsapp` | Inbound messages (`Hello`, list replies)                     |
| POST   | `/webhooks/paystack` | `charge.success` → mark booking paid, send confirmation      |
| GET    | `/health`            | Liveness check                                               |

## Security notes

- **Paystack webhooks** are verified with `x-paystack-signature` (HMAC-SHA512). The server then re-checks each transaction with `GET /transaction/verify/:reference` and confirms the amount before marking the booking paid.
- **WhatsApp webhooks** are verified with `X-Hub-Signature-256` when `WHATSAPP_APP_SECRET` is set.
- **Duplicate deliveries**: the `pending → paid` update is conditional, so if Paystack sends the same event twice, the customer is notified only once.
- The server uses the Supabase **service_role** key. RLS is enabled with no policies, so the anon key cannot read or write these tables.

## Caveats

- WhatsApp only allows free-form messages within **24 hours** of the customer's last message. If someone pays after that window closes, the confirmation will fail. For production, send it with an approved **message template** instead.
- An interactive list can show at most **10 rows**. Titles are cut off at 24 characters and descriptions at 72.
- Prices are stored in major units (for example, Naira) and converted to kobo for Paystack.

## Tests

`npm test` runs the whole flow end to end, with in-memory fakes standing in for Supabase, WhatsApp and Paystack.
