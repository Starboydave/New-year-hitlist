import { config } from '../config';
import { sheetsApi } from './googleAuth';
import { normalizePhone } from '../utils/phone';
import { formatLagos } from '../utils/time';
import { log } from '../utils/logger';

export type LeadClass = 'high_ticket' | 'qualified' | 'disqualified';

export function classifyLead(budgetNgn: number | null): LeadClass {
  if (budgetNgn === null) return 'qualified'; // unknown budget: let a human qualify on the tour
  if (config.leads.minBudgetNgn > 0 && budgetNgn < config.leads.minBudgetNgn) return 'disqualified';
  return budgetNgn >= config.leads.highTicketMinNgn ? 'high_ticket' : 'qualified';
}

/** Is this caller already in the "Clients" tab (column A = phone)? */
export async function isExistingClient(phone: string): Promise<boolean> {
  const target = normalizePhone(phone);
  if (!target || !config.google.sheetId) return false;
  const { data } = await sheetsApi().spreadsheets.values.get({
    spreadsheetId: config.google.sheetId,
    range: `${config.google.clientsTab}!A:A`,
  });
  return (data.values ?? []).some((row) => normalizePhone(row[0]) === target);
}

export interface LeadRow {
  name: string;
  phone: string;
  email?: string;
  budgetLabel: string;
  budgetNgn: number | null;
  preference: string;
  tourAt?: number;
  eventId?: string;
  callId?: string;
  status: 'Tour Booked' | 'Disqualified';
  leadClass: LeadClass;
}

/** Columns: Timestamp | Name | Phone | Email | Budget (as spoken) | Budget NGN | Preference | Tour | Event ID | Call ID | Status | Class */
export async function appendLead(l: LeadRow): Promise<void> {
  await sheetsApi().spreadsheets.values.append({
    spreadsheetId: config.google.sheetId,
    range: `${config.google.leadsTab}!A:L`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        formatLagos(Date.now()),
        l.name,
        l.phone,
        l.email ?? '',
        l.budgetLabel,
        l.budgetNgn ?? '',
        l.preference,
        l.tourAt ? formatLagos(l.tourAt) : '',
        l.eventId ?? '',
        l.callId ?? '',
        l.status,
        l.leadClass,
      ]],
    },
  });
}

/** Sheet writes are off the voice hot-path: retry in the background, never block the caller. */
export function appendLeadInBackground(l: LeadRow, attempt = 1): void {
  appendLead(l).catch((err) => {
    if (attempt >= 4) return log.error('CRM append gave up — lead needs manual entry', err, { lead: l });
    setTimeout(() => appendLeadInBackground(l, attempt + 1), 2000 * attempt);
  });
}
