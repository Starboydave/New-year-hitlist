# AI Voice Receptionist — Webhook & Middleware Server

Vapi (voice) ⇄ this server ⇄ Google Calendar / Sheets / Gmail + Green API (WhatsApp).

```
src/
  server.ts                 Express boot, /health, admin briefing trigger
  routes/vapiWebhook.ts     POST /api/vapi-webhook  (tool-calls, transfer-destination-request, end-of-call-report)
  prompts/systemPrompt.ts   Persona + Full-Transparency pricing + Polite-Pivot rules (edit BUSINESS_KNOWLEDGE)
  services/
    vapiService.ts          auth, tool dispatch, 800ms budget, Ghost Transfer, route_department/book_and_log/trigger_nurture
    calendarService.ts      freebusy (1 call, also yields alternatives) + idempotent event insert
    crmService.ts           Sheets lead append (background, retried), existing-client lookup, lead classification
    whatsappService.ts      Green API sender + 3-touch nurture queue
    cronJobs.ts             6 PM briefing (WhatsApp digest + Gmail drafts) and per-minute nurture tick
    store.ts                JSON-file persistence (swap for Redis/Postgres if you scale out)
scripts/                    print-vapi-config.ts, get-refresh-token.ts
```

## Setup

```bash
cd voice-receptionist
npm install
cp .env.example .env        # fill in values
npm run google:token        # one-time: prints GOOGLE_REFRESH_TOKEN (see script header)
```

Create a Google Sheet with tabs **Leads** and **Clients** (existing clients' phone numbers in column A).

## Run locally with ngrok

```bash
# terminal 1
npm run dev                 # http://localhost:3000  (check: curl localhost:3000/health)

# terminal 2
ngrok http 3000             # copy the https://….ngrok-free.app URL
```

1. Put the ngrok URL in `.env` as `PUBLIC_BASE_URL`, then run `npm run print:vapi`.
2. In the Vapi dashboard create an assistant: paste the `systemPrompt`, add the tools from `tools`
   (each has `server.url` = `<ngrok>/api/vapi-webhook` and the secret), and set the same secret as `VAPI_WEBHOOK_SECRET`.
   The `transferCall` tool has **empty destinations** on purpose: the server supplies the number dynamically.
3. Call the assistant's number (or use "Talk to assistant").

**Browser test console:** with the server running, open http://localhost:3000/console to fire sample Vapi events (complaint caller, book a tour, forced error, etc.) and see the reply and response time. It is disabled when `NODE_ENV=production`.

Test the 6 PM briefing without waiting: `curl -X POST -H "x-admin-token: $ADMIN_TOKEN" localhost:3000/api/admin/run-briefing`

## Behaviour worth knowing

- **Ghost Transfer**: any tool error or >`VAPI_TOOL_BUDGET_MS` (800 ms) returns a transfer payload to `BACKUP_RING_GROUP_NUMBER`.
  A timed-out `book_and_log` may still complete in the background; the calendar event id is derived from the Vapi tool-call id, so retries never double-book.
- **Latency**: calendar freebusy + insert are on the hot path; Sheets append, WhatsApp and nurture queueing are not.
  Measure real numbers from your hosting region and tune `VAPI_TOOL_BUDGET_MS`.
- **Disqualified leads** (budget < `MIN_BUDGET_NGN`) are logged but not booked. Set `MIN_BUDGET_NGN=0` to disable.
- **Nurture**: confirmation immediately; Day 2 reminder 24h before the tour (3h if sooner); Day 3 "agent at the gate" 30 min before.
- **Verify against current Vapi docs**: the exact JSON Vapi honours for a transfer returned from a `tool-calls` response. The
  `transfer-destination-request` path is the documented one; the tool-call path also instructs the model to call `transferCall`.
