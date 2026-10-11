import cron from 'node-cron';
import { config } from '../config';
import { log } from '../utils/logger';
import { formatNgn } from '../utils/phone';
import { formatLagos, lagosDayKey } from '../utils/time';
import { gmailApi } from './googleAuth';
import { eventsBetween, LeadSnapshot, markDrafted, pruneNurture, wasDrafted } from './store';
import { processNurtureQueue, sendWhatsApp } from './whatsappService';

// ── Metrics ──────────────────────────────────────────────────────────────────

export interface DailyMetrics {
  date: string;
  totalCalls: number;
  bookedTours: number;
  disqualified: number;
  vipTransfers: number;
  ghostTransfers: number;
  highTicketLeads: LeadSnapshot[];
}

export function collectMetrics(now = Date.now()): DailyMetrics {
  const key = lagosDayKey(now);
  // Query a generous window, then filter by Lagos calendar day.
  const events = eventsBetween(now - 36 * 3600_000, now + 3600_000).filter((e) => lagosDayKey(e.ts) === key);
  const count = (t: string) => events.filter((e) => e.type === t).length;
  return {
    date: key,
    totalCalls: count('call'),
    bookedTours: count('tour_booked'),
    disqualified: count('disqualified'),
    vipTransfers: count('vip_transfer'),
    ghostTransfers: count('ghost_transfer'),
    highTicketLeads: events.filter((e) => e.type === 'tour_booked' && e.highTicket && e.lead).map((e) => e.lead!),
  };
}

export function formatDigest(m: DailyMetrics): string {
  const lines = [
    `📊 *Executive Briefing — ${formatLagos(Date.now(), { weekday: 'long', day: 'numeric', month: 'long', hour: undefined, minute: undefined, hour12: undefined })}*`,
    '',
    `📞 Total calls: *${m.totalCalls}*`,
    `📅 Tours booked: *${m.bookedTours}*`,
    `🚫 Disqualified leads: *${m.disqualified}*`,
    `⭐ VIP transfers (existing clients): *${m.vipTransfers}*`,
  ];
  if (m.ghostTransfers) lines.push(`⚠️ Failover transfers to humans: *${m.ghostTransfers}*`);
  if (m.highTicketLeads.length) {
    lines.push('', '💎 *High-ticket leads*');
    for (const l of m.highTicketLeads) {
      lines.push(`• ${l.name} — ${l.budgetNgn ? formatNgn(l.budgetNgn) : 'budget n/a'} — ${l.preference}${l.tourAt ? ` — tour ${formatLagos(l.tourAt)}` : ''}`);
    }
    lines.push('', '✉️ Follow-up drafts are waiting in your Gmail Drafts.');
  }
  return lines.join('\n');
}

// ── Gmail drafts ─────────────────────────────────────────────────────────────

const b64url = (s: string) => Buffer.from(s).toString('base64url');

function buildDraft(l: LeadSnapshot): string {
  const first = l.name.split(/\s+/)[0];
  const tour = l.tourAt ? formatLagos(l.tourAt) : 'the time we agreed';
  const body = [
    `Dear ${first},`,
    '',
    `Thank you for speaking with ${config.businessName}. It was a pleasure learning about your interest in ${l.preference}.`,
    '',
    `Your private viewing is set for ${tour}. Ahead of it, I would be glad to share the full brochure, current pricing and available payment plans, and to answer any technical questions with our engineer on site.`,
    '',
    'Please let me know if there is anything specific you would like us to prepare.',
    '',
    'Warm regards,',
    config.businessName,
  ].join('\r\n');

  return [
    l.email ? `To: ${l.email}` : 'To: ',
    `Subject: Your private viewing — ${config.businessName}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');
}

export async function createFollowUpDrafts(leads: LeadSnapshot[]): Promise<number> {
  let created = 0;
  for (const l of leads) {
    if (wasDrafted(l.id)) continue; // idempotent: a manual re-run won't duplicate drafts
    await gmailApi().users.drafts.create({
      userId: 'me',
      requestBody: { message: { raw: b64url(buildDraft(l)) } },
    });
    markDrafted(l.id);
    created++;
  }
  return created;
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function runExecutiveBriefing() {
  const metrics = collectMetrics();
  log.info('executive briefing', { ...metrics, highTicketLeads: metrics.highTicketLeads.length });

  // Independent: a Gmail failure must not stop the WhatsApp digest (and vice versa).
  const [wa, drafts] = await Promise.allSettled([
    sendWhatsApp(config.owner.whatsapp, formatDigest(metrics)),
    createFollowUpDrafts(metrics.highTicketLeads),
  ]);
  if (wa.status === 'rejected') log.error('briefing WhatsApp failed', wa.reason);
  if (drafts.status === 'rejected') log.error('briefing Gmail drafts failed', drafts.reason);
  return { metrics, whatsapp: wa.status, drafts: drafts.status === 'fulfilled' ? drafts.value : drafts.status };
}

export function startCronJobs() {
  cron.schedule(config.briefingCron, () => void runExecutiveBriefing().catch((e) => log.error('briefing crashed', e)), {
    timezone: config.timezone,
  });
  // Nurture scheduler: due Day 2 / Day 3 WhatsApps (also retries failed sends).
  cron.schedule('* * * * *', () => void processNurtureQueue().catch((e) => log.error('nurture tick crashed', e)), {
    timezone: config.timezone,
  });
  cron.schedule('0 3 * * *', () => pruneNurture(), { timezone: config.timezone });
  log.info('cron scheduled', { briefing: config.briefingCron, tz: config.timezone });
}
