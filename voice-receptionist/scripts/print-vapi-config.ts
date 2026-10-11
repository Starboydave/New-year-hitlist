/**
 * Prints the system prompt + tool definitions to paste into the Vapi dashboard (or POST to the Vapi API).
 *   npm run print:vapi
 */
import { config } from '../src/config';
import { SYSTEM_PROMPT } from '../src/prompts/systemPrompt';

const server = {
  url: `${config.publicBaseUrl || 'https://YOUR-NGROK-URL'}/api/vapi-webhook`,
  secret: config.vapi.secret || 'SET_VAPI_WEBHOOK_SECRET',
  timeoutSeconds: 10,
};

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'function',
  async: false,
  function: { name, description, parameters: { type: 'object', properties, required } },
  server,
});

const tools = [
  fn('route_department', 'Call once, as soon as you know why the caller is phoning. Routes existing clients/complaints to the Property Manager.', {
    intent: { type: 'string', enum: ['new_booking', 'existing_client', 'complaint', 'other'] },
    phone: { type: 'string', description: 'Caller phone if different from the calling number' },
  }, ['intent']),
  fn('book_and_log', 'Checks the calendar, books the tour and logs the lead. Call only after collecting name, budget, preference and a time.', {
    name: { type: 'string' },
    phone: { type: 'string' },
    email: { type: 'string' },
    budget: { type: 'string', description: 'As spoken, e.g. "250 million naira"' },
    preference: { type: 'string', description: 'Property or event interest, e.g. "4-bed Ikoyi" or "Grand Hall wedding"' },
    start_time: { type: 'string', description: 'ISO-8601 with Lagos offset, e.g. 2026-03-14T11:00:00+01:00' },
  }, ['name', 'budget', 'preference', 'start_time']),
  // Empty destinations ⇒ Vapi asks our server for the destination via `transfer-destination-request`.
  { type: 'transferCall', destinations: [], function: { name: 'transferCall' }, server },
];

console.log(JSON.stringify({ serverUrl: server.url, serverUrlSecret: server.secret, systemPrompt: SYSTEM_PROMPT, tools }, null, 2));
