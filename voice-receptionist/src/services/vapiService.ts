import crypto from 'crypto';
import { config } from '../config';
import { log } from '../utils/logger';
import { normalizePhone, parseBudgetNgn, toE164, formatNgn } from '../utils/phone';
import { formatLagos } from '../utils/time';
import { checkAvailability, createTourEvent } from './calendarService';
import { appendLeadInBackground, classifyLead, isExistingClient } from './crmService';
import { triggerNurture } from './whatsappService';
import { recordEvent } from './store';

// ── Vapi wire types (only what we use) ───────────────────────────────────────

export interface VapiToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
}

export interface VapiMessage {
  type: string;
  call?: { id?: string; customer?: { number?: string } };
  toolCallList?: VapiToolCall[];
  toolCalls?: Array<{ id: string; function?: { name: string; arguments: unknown } }>;
  [k: string]: unknown;
}

export interface TransferDestination {
  type: 'number';
  number: string;
  message?: string;
  numberE164CheckEnabled?: boolean;
}

/** What a tool handler returns: text for the model to speak from, and optionally a transfer. */
export interface ToolOutcome {
  result: unknown;
  transfer?: TransferDestination;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

/** Vapi sends the "Server URL Secret" in the x-vapi-secret header. Constant-time compare. */
export function verifyVapiSecret(header: string | undefined): boolean {
  if (!config.vapi.secret) return !config.isProd; // allow unsigned only in local dev
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(config.vapi.secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Parsing ──────────────────────────────────────────────────────────────────

export function extractToolCalls(m: VapiMessage): VapiToolCall[] {
  if (Array.isArray(m.toolCallList) && m.toolCallList.length) return m.toolCallList;
  return (m.toolCalls ?? []).map((t) => {
    const raw = t.function?.arguments;
    let parameters: Record<string, any> = {};
    try {
      parameters = typeof raw === 'string' ? JSON.parse(raw || '{}') : ((raw as any) ?? {});
    } catch { /* leave empty */ }
    return { id: t.id, name: t.function?.name ?? '', parameters };
  });
}

// ── Ghost Transfer ───────────────────────────────────────────────────────────

const ghostDestination = (): TransferDestination => ({
  type: 'number',
  number: toE164(config.transfer.backupRingGroup),
  message: 'One moment please, let me connect you with a member of our team.',
  numberE164CheckEnabled: false,
});

/**
 * Builds the response that blind-forwards the live call.
 *  - `transfer-destination-request`  → Vapi's documented `{ destination }` response.
 *  - `tool-calls`                    → a result per tool call carrying the same transfer payload, plus a top-level
 *                                      `destination`, and an instruction for the model to invoke its `transferCall` tool.
 * Pair this with a `transferCall` tool (empty `destinations`) on the assistant — see scripts/print-vapi-config.ts.
 */
export function transferResponse(dest: TransferDestination, toolCallIds: string[] = [], note = '') {
  const payload = { transferCall: { destination: dest } };
  return {
    destination: dest,
    results: toolCallIds.map((toolCallId) => ({
      toolCallId,
      result: JSON.stringify({
        ...payload,
        instruction: `${note} Immediately use the transferCall tool to connect the caller to ${dest.number}. Say nothing else.`.trim(),
      }),
    })),
  };
}

export function ghostTransfer(m: VapiMessage, reason: string, toolCallIds: string[] = []) {
  log.warn('GHOST TRANSFER', { reason, callId: m.call?.id });
  recordEvent({ type: 'ghost_transfer', callId: m.call?.id ? `${m.call.id}:${Date.now()}` : undefined });
  return transferResponse(ghostDestination(), toolCallIds);
}

/** Rejects after `ms` so a slow downstream (Google, Green API) can't leave the caller in dead air. */
export class BudgetExceeded extends Error {}
export function withBudget<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new BudgetExceeded(`exceeded ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

// ── Tool handlers ────────────────────────────────────────────────────────────

type Handler = (args: Record<string, any>, ctx: { callId?: string; callerPhone: string; toolCallId: string }) => Promise<ToolOutcome>;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

/** route_department — PBX switchboard: existing client / complaint → Property Manager, otherwise sales flow. */
const route_department: Handler = async (args, ctx) => {
  const intent = str(args.intent).toLowerCase(); // 'new_booking' | 'existing_client' | 'complaint' | 'other'
  const phone = str(args.phone) || ctx.callerPhone;

  const claimsExisting = ['existing_client', 'complaint', 'maintenance', 'billing'].includes(intent);
  const knownClient = claimsExisting ? true : await isExistingClient(phone);

  if (claimsExisting || knownClient) {
    recordEvent({ type: 'vip_transfer', callId: ctx.callId });
    return {
      result: 'Caller is an existing client. Tell them you are connecting them to their Property Manager, then transfer.',
      transfer: {
        type: 'number',
        number: toE164(config.transfer.propertyManager),
        message: 'Of course. Let me connect you with your Property Manager right away.',
        numberE164CheckEnabled: false,
      },
    };
  }
  return { result: { route: 'sales', instruction: 'New enquiry. Continue the sales flow: qualify, then offer a tour.' } };
};

/** book_and_log — availability check → calendar insert → CRM row (+ nurture kick-off). */
const book_and_log: Handler = async (args, ctx) => {
  const name = str(args.name);
  const phone = str(args.phone) || ctx.callerPhone;
  const email = str(args.email) || undefined;
  const preference = str(args.preference || args.property_or_event) || 'General enquiry';
  const budgetLabel = str(args.budget) || 'Not stated';
  const budgetNgn = parseBudgetNgn(args.budget);
  const startMs = Date.parse(str(args.start_time));

  if (!name || !Number.isFinite(startMs)) {
    return { result: { booked: false, error: 'Need the caller name and a valid start_time (ISO 8601 with +01:00 offset).' } };
  }

  const leadClass = classifyLead(budgetNgn);
  const leadBase = { name, phone, email, budgetLabel, budgetNgn, preference, callId: ctx.callId, leadClass };

  if (leadClass === 'disqualified') {
    recordEvent({ type: 'disqualified', callId: ctx.callId });
    appendLeadInBackground({ ...leadBase, status: 'Disqualified' });
    return {
      result: {
        booked: false,
        disqualified: true,
        instruction: `Budget ${formatNgn(budgetNgn!)} is below our minimum. Politely and warmly explain, offer to send our brochure on WhatsApp for future options, and close the call gracefully. Do not mention a "minimum budget" bluntly.`,
      },
    };
  }

  const avail = await checkAvailability(startMs);
  if (!avail.free) {
    return {
      result: {
        booked: false,
        reason: avail.reason,
        alternatives: avail.suggestions.map((s) => formatLagos(Date.parse(s))),
        alternativesIso: avail.suggestions,
        instruction: 'That slot is unavailable. Offer the alternatives naturally and re-call book_and_log with the one the caller picks.',
      },
    };
  }

  const ev = await createTourEvent({ idempotencyKey: ctx.toolCallId, name, phone, email, budgetLabel, preference, startMs });

  // Everything below is off the hot path: the caller hears the confirmation as soon as the calendar write lands.
  recordEvent({
    type: 'tour_booked',
    callId: ctx.callId,
    highTicket: leadClass === 'high_ticket',
    lead: { id: ev.eventId, name, phone, email, budgetNgn, preference, tourAt: startMs },
  });
  appendLeadInBackground({ ...leadBase, tourAt: startMs, eventId: ev.eventId, status: 'Tour Booked' });
  triggerNurture({ bookingId: ev.eventId, phone, name, preference, tourAt: startMs });

  return {
    result: {
      booked: true,
      when: formatLagos(startMs),
      instruction: 'Confirm the date and time aloud and tell the caller a WhatsApp confirmation is on its way.',
    },
  };
};

/** trigger_nurture — standalone entry point (e.g. for bookings made by a human); book_and_log already calls it. */
const trigger_nurture: Handler = async (args, ctx) => {
  const startMs = Date.parse(str(args.start_time));
  const phone = str(args.phone) || ctx.callerPhone;
  if (!phone || !Number.isFinite(startMs)) return { result: { queued: false, error: 'phone and start_time are required' } };
  triggerNurture({
    bookingId: str(args.booking_id) || ctx.toolCallId,
    phone,
    name: str(args.name) || 'there',
    preference: str(args.preference) || 'property viewing',
    tourAt: startMs,
  });
  return { result: { queued: true } };
};

const HANDLERS: Record<string, Handler> = { route_department, book_and_log, trigger_nurture };

/**
 * Runs all tool calls in a Vapi `tool-calls` message inside the latency budget.
 * Any thrown error or budget overrun → Ghost Transfer (never dead air, never a stack trace read aloud).
 */
export async function handleToolCalls(m: VapiMessage) {
  const calls = extractToolCalls(m);
  const ids = calls.map((c) => c.id);
  const callerPhone = normalizePhone(m.call?.customer?.number);

  try {
    const outcomes = await withBudget(
      Promise.all(
        calls.map(async (c) => {
          const h = HANDLERS[c.name];
          if (!h) throw new Error(`unknown tool: ${c.name}`);
          return { id: c.id, out: await h(c.parameters ?? {}, { callId: m.call?.id, callerPhone, toolCallId: c.id }) };
        }),
      ),
      config.vapi.toolBudgetMs,
    );

    const transfer = outcomes.find((o) => o.out.transfer)?.out.transfer;
    if (transfer) return transferResponse(transfer, ids, 'Existing client detected.');

    return {
      results: outcomes.map((o) => ({
        toolCallId: o.id,
        result: typeof o.out.result === 'string' ? o.out.result : JSON.stringify(o.out.result),
      })),
    };
  } catch (err) {
    log.error('tool-calls failed', err, { callId: m.call?.id, tools: calls.map((c) => c.name) });
    return ghostTransfer(m, err instanceof BudgetExceeded ? 'latency' : 'error', ids);
  }
}
