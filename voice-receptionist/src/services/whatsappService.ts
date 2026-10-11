import axios from 'axios';
import { config } from '../config';
import { normalizePhone } from '../utils/phone';
import { formatLagos } from '../utils/time';
import { log } from '../utils/logger';
import { dueNurture, enqueueNurture, NurtureItem, NurtureKind, updateNurture } from './store';

// ── Green API ────────────────────────────────────────────────────────────────

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const to = normalizePhone(phone);
  if (!to) throw new Error('sendWhatsApp: empty phone number');
  const { idInstance, token, host } = config.greenApi;
  await axios.post(
    `${host}/waInstance${idInstance}/sendMessage/${token}`,
    { chatId: `${to}@c.us`, message },
    { timeout: 10_000 },
  );
}

// ── Message templates ────────────────────────────────────────────────────────

const firstName = (n: string) => n.trim().split(/\s+/)[0] || 'there';

function render(kind: NurtureKind, it: NurtureItem): string {
  const when = formatLagos(it.tourAt);
  const hi = firstName(it.name);
  switch (kind) {
    case 'confirmation':
      return `Hello ${hi}, this is ${config.businessName}. ✅ Your private viewing (${it.preference}) is confirmed for *${when}*.\n\nYour dedicated agent will meet you on arrival. Reply here any time if you need to adjust the time or have questions for our engineer before the tour.`;
    case 'day2_reminder':
      return `Good day ${hi} 👋 A gentle reminder from ${config.businessName}: your private viewing (${it.preference}) is scheduled for *${when}*.\n\nPlease reply *YES* to confirm you're still coming, or let us know and we'll reschedule at your convenience.`;
    case 'day3_gate':
      return `Hello ${hi} — your agent from ${config.businessName} is arriving at the gate for your ${it.preference} viewing. 🚪 Please keep your phone close; we'll call if we need to guide you in.`;
  }
}

// ── 3-day nurture engine ─────────────────────────────────────────────────────

/**
 * Queues the three touches for a confirmed tour:
 *  Day 1  confirmation       immediately
 *  Day 2  tour reminder      24h before the tour (or 3h before if the tour is sooner than 24h away)
 *  Day 3  "agent at the gate" 30 min before the tour
 * Items are persisted (store.ts) and fired by the per-minute scheduler in cronJobs.ts.
 */
export function triggerNurture(p: { bookingId: string; phone: string; name: string; preference: string; tourAt: number }): void {
  const now = Date.now();
  const base = { phone: p.phone, name: p.name, preference: p.preference, tourAt: p.tourAt, attempts: 0 };
  const items: NurtureItem[] = [{ ...base, id: `${p.bookingId}:confirmation`, kind: 'confirmation', sendAt: now }];

  let reminderAt = p.tourAt - 24 * 3600_000;
  if (reminderAt < now + 5 * 60_000) reminderAt = p.tourAt - 3 * 3600_000;
  if (reminderAt > now + 5 * 60_000) items.push({ ...base, id: `${p.bookingId}:day2`, kind: 'day2_reminder', sendAt: reminderAt });

  const gateAt = p.tourAt - 30 * 60_000;
  if (gateAt > now) items.push({ ...base, id: `${p.bookingId}:day3`, kind: 'day3_gate', sendAt: gateAt });

  enqueueNurture(items);
  void processNurtureQueue(); // fire the confirmation right away, off the voice hot-path
}

const inFlight = new Set<string>();

/** Sends everything that is due. Called after a booking and every minute by cron. Failed sends retry (max 4). */
export async function processNurtureQueue(): Promise<void> {
  for (const it of dueNurture()) {
    if (inFlight.has(it.id)) continue;
    inFlight.add(it.id);
    try {
      await sendWhatsApp(it.phone, render(it.kind, it));
      updateNurture(it.id, { sentAt: Date.now() });
    } catch (err) {
      const attempts = it.attempts + 1;
      log.error('nurture send failed', err, { id: it.id, attempts });
      updateNurture(it.id, attempts >= 4 ? { attempts, failed: true } : { attempts, sendAt: Date.now() + 60_000 * attempts });
    } finally {
      inFlight.delete(it.id);
    }
  }
}
