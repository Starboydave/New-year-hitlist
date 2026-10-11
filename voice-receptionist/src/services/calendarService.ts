import crypto from 'crypto';
import { config } from '../config';
import { calendarApi } from './googleAuth';
import { formatLagos, fromLagos, lagosParts } from '../utils/time';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export interface AvailabilityResult {
  free: boolean;
  reason?: 'in_past' | 'outside_hours' | 'busy';
  /** ISO strings of nearby open slots (Lagos business hours), nearest first. */
  suggestions: string[];
}

const iso = (ms: number) => new Date(ms).toISOString();
const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

function insideBusinessHours(startMs: number, endMs: number): boolean {
  const s = lagosParts(startMs);
  const e = lagosParts(endMs);
  const sameDay = s.year === e.year && s.month === e.month && s.day === e.day;
  const endHourFrac = e.hour + e.minute / 60;
  return sameDay && s.hour >= config.tours.startHour && endHourFrac <= config.tours.endHour;
}

/**
 * ONE freebusy call covers the requested slot and the next 3 days, so a "busy" answer
 * can immediately offer alternatives without a second round trip (latency matters on a live call).
 */
export async function checkAvailability(startMs: number, durationMin = config.tours.durationMin): Promise<AvailabilityResult> {
  const endMs = startMs + durationMin * 60_000;
  const now = Date.now();

  const windowStart = Math.max(now, startMs - HOUR);
  const windowEnd = startMs + 3 * DAY;
  const { data } = await calendarApi().freebusy.query({
    requestBody: {
      timeMin: iso(windowStart),
      timeMax: iso(windowEnd),
      timeZone: config.timezone,
      items: [{ id: config.google.calendarId }],
    },
  });
  const busy = (data.calendars?.[config.google.calendarId]?.busy ?? []).map((b) => ({
    s: Date.parse(b.start!),
    e: Date.parse(b.end!),
  }));
  const isFree = (s: number, e: number) => !busy.some((b) => overlaps(s, e, b.s, b.e));

  let reason: AvailabilityResult['reason'];
  if (startMs <= now) reason = 'in_past';
  else if (!insideBusinessHours(startMs, endMs)) reason = 'outside_hours';
  else if (!isFree(startMs, endMs)) reason = 'busy';
  if (!reason) return { free: true, suggestions: [] };

  // Hourly grid inside business hours on the requested day and the following 2 days.
  const base = lagosParts(Math.max(startMs, now));
  const suggestions: string[] = [];
  for (let d = 0; d < 3 && suggestions.length < 3; d++) {
    for (let h = config.tours.startHour; h < config.tours.endHour && suggestions.length < 3; h++) {
      const s = fromLagos(base.year, base.month, base.day + d, h);
      const e = s + durationMin * 60_000;
      if (s > now + HOUR && s < windowEnd && insideBusinessHours(s, e) && isFree(s, e)) suggestions.push(iso(s));
    }
  }
  return { free: false, reason, suggestions };
}

export interface BookingInput {
  idempotencyKey: string;
  name: string;
  phone: string;
  email?: string;
  budgetLabel: string;
  preference: string;
  startMs: number;
  durationMin?: number;
}

/**
 * Inserts the tour event. The event id is derived from `idempotencyKey` (the Vapi tool-call id)
 * so a retried webhook can never double-book: a 409 means "already created".
 */
export async function createTourEvent(b: BookingInput): Promise<{ eventId: string; htmlLink?: string }> {
  // Google event ids: base32hex chars (a-v, 0-9), 5-1024 long. sha1 hex satisfies that.
  const eventId = crypto.createHash('sha1').update(b.idempotencyKey).digest('hex');
  const endMs = b.startMs + (b.durationMin ?? config.tours.durationMin) * 60_000;
  try {
    const { data } = await calendarApi().events.insert({
      calendarId: config.google.calendarId,
      sendUpdates: b.email ? 'all' : 'none',
      requestBody: {
        id: eventId,
        summary: `Tour: ${b.name} — ${b.preference}`,
        description: [
          `Lead: ${b.name}`,
          `Phone: ${b.phone}`,
          b.email ? `Email: ${b.email}` : '',
          `Budget: ${b.budgetLabel}`,
          `Interest: ${b.preference}`,
          'Booked by AI Voice Receptionist.',
        ].filter(Boolean).join('\n'),
        start: { dateTime: iso(b.startMs), timeZone: config.timezone },
        end: { dateTime: iso(endMs), timeZone: config.timezone },
        attendees: b.email ? [{ email: b.email, displayName: b.name }] : undefined,
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
      },
    });
    return { eventId: data.id ?? eventId, htmlLink: data.htmlLink ?? undefined };
  } catch (err: any) {
    if (err?.code === 409 || err?.status === 409) return { eventId };
    throw err;
  }
}

export const describeSlot = (ms: number) => formatLagos(ms);
