/**
 * Tiny JSON-file persistence for call metrics + the nurture queue.
 * Fine for a single-instance deployment on a persistent disk. If you scale out
 * (or deploy on an ephemeral filesystem) swap this module for Redis/Postgres —
 * the exported functions are the only surface the rest of the app touches.
 */
import fs from 'fs';
import path from 'path';
import { log } from '../utils/logger';

export type EventType =
  | 'call'            // one per finished call (end-of-call-report)
  | 'tour_booked'
  | 'disqualified'
  | 'vip_transfer'    // existing client / complaint routed to the Property Manager
  | 'ghost_transfer'; // failover to human ring group

export interface LeadSnapshot {
  id: string;
  name: string;
  phone: string;
  email?: string;
  budgetNgn: number | null;
  preference: string;
  tourAt?: number;
}

export interface CallEvent {
  type: EventType;
  ts: number;
  callId?: string;
  lead?: LeadSnapshot;
  highTicket?: boolean;
}

export type NurtureKind = 'confirmation' | 'day2_reminder' | 'day3_gate';

export interface NurtureItem {
  id: string;
  kind: NurtureKind;
  phone: string;
  name: string;
  preference: string;
  tourAt: number;
  sendAt: number;
  attempts: number;
  sentAt?: number;
  failed?: boolean;
}

interface Shape {
  events: CallEvent[];
  nurture: NurtureItem[];
  draftedLeadIds: string[];
}

const FILE = path.resolve(process.cwd(), 'data/store.json');
let db: Shape = { events: [], nurture: [], draftedLeadIds: [] };

try {
  if (fs.existsSync(FILE)) db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
} catch (err) {
  log.error('store: failed to load, starting empty', err);
}

let dirty = false;
let scheduled = false;
function persist() {
  dirty = true;
  if (scheduled) return;
  scheduled = true;
  setImmediate(flush);
}

export function flush() {
  scheduled = false;
  if (!dirty) return;
  dirty = false;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(db));
    fs.renameSync(`${FILE}.tmp`, FILE);
  } catch (err) {
    log.error('store: persist failed', err);
  }
}
process.on('SIGTERM', flush);
process.on('SIGINT', flush);

// ── events / metrics ─────────────────────────────────────────────────────────

/** Records an event; (type, callId) pairs are de-duplicated so Vapi retries don't double count. */
export function recordEvent(e: Omit<CallEvent, 'ts'> & { ts?: number }) {
  if (e.callId && db.events.some((x) => x.type === e.type && x.callId === e.callId)) return;
  db.events.push({ ...e, ts: e.ts ?? Date.now() });
  persist();
}

export const eventsBetween = (fromMs: number, toMs: number) =>
  db.events.filter((e) => e.ts >= fromMs && e.ts < toMs);

export const wasDrafted = (leadId: string) => db.draftedLeadIds.includes(leadId);
export function markDrafted(leadId: string) {
  db.draftedLeadIds.push(leadId);
  persist();
}

// ── nurture queue ────────────────────────────────────────────────────────────

export function enqueueNurture(items: NurtureItem[]) {
  for (const it of items) if (!db.nurture.some((x) => x.id === it.id)) db.nurture.push(it);
  persist();
}

export const dueNurture = (now = Date.now()) =>
  db.nurture.filter((n) => !n.sentAt && !n.failed && n.sendAt <= now);

export function updateNurture(id: string, patch: Partial<NurtureItem>) {
  const it = db.nurture.find((n) => n.id === id);
  if (it) Object.assign(it, patch);
  persist();
}

/** Housekeeping: drop finished queue items older than 14 days. */
export function pruneNurture(now = Date.now()) {
  const cutoff = now - 14 * 24 * 3600 * 1000;
  db.nurture = db.nurture.filter((n) => !(n.sentAt || n.failed) || n.sendAt > cutoff);
  persist();
}
