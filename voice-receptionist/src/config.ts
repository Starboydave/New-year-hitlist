import 'dotenv/config';

const env = process.env;

const str = (key: string, fallback = ''): string => (env[key] ?? fallback).trim();
const num = (key: string, fallback: number): number => {
  const n = Number(env[key]);
  return env[key] && Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: num('PORT', 3000),
  isProd: str('NODE_ENV') === 'production',
  publicBaseUrl: str('PUBLIC_BASE_URL'),
  timezone: 'Africa/Lagos',
  businessName: str('BUSINESS_NAME', 'Our Luxury Properties & Events'),

  vapi: {
    secret: str('VAPI_WEBHOOK_SECRET'),
    toolBudgetMs: num('VAPI_TOOL_BUDGET_MS', 800),
  },

  transfer: {
    backupRingGroup: str('BACKUP_RING_GROUP_NUMBER'),
    propertyManager: str('PROPERTY_MANAGER_NUMBER'),
  },

  google: {
    clientId: str('GOOGLE_CLIENT_ID'),
    clientSecret: str('GOOGLE_CLIENT_SECRET'),
    refreshToken: str('GOOGLE_REFRESH_TOKEN'),
    calendarId: str('GOOGLE_CALENDAR_ID', 'primary'),
    sheetId: str('GOOGLE_SHEET_ID'),
    leadsTab: str('SHEET_LEADS_TAB', 'Leads'),
    clientsTab: str('SHEET_CLIENTS_TAB', 'Clients'),
  },

  tours: {
    durationMin: num('TOUR_DURATION_MIN', 60),
    startHour: num('TOUR_START_HOUR', 10),
    endHour: num('TOUR_END_HOUR', 17),
  },

  leads: {
    highTicketMinNgn: num('HIGH_TICKET_MIN_NGN', 50_000_000),
    minBudgetNgn: num('MIN_BUDGET_NGN', 5_000_000),
  },

  greenApi: {
    idInstance: str('GREEN_API_ID_INSTANCE'),
    token: str('GREEN_API_TOKEN'),
    host: str('GREEN_API_HOST', 'https://api.green-api.com'),
  },

  owner: {
    whatsapp: str('OWNER_WHATSAPP'),
    email: str('OWNER_EMAIL'),
  },

  briefingCron: str('BRIEFING_CRON', '0 18 * * *'),
  adminToken: str('ADMIN_TOKEN'),
};

/** Env vars that must be present for the full system to work. */
const REQUIRED: Array<[string, string]> = [
  ['VAPI_WEBHOOK_SECRET', config.vapi.secret],
  ['BACKUP_RING_GROUP_NUMBER', config.transfer.backupRingGroup],
  ['PROPERTY_MANAGER_NUMBER', config.transfer.propertyManager],
  ['GOOGLE_CLIENT_ID', config.google.clientId],
  ['GOOGLE_CLIENT_SECRET', config.google.clientSecret],
  ['GOOGLE_REFRESH_TOKEN', config.google.refreshToken],
  ['GOOGLE_SHEET_ID', config.google.sheetId],
  ['GREEN_API_ID_INSTANCE', config.greenApi.idInstance],
  ['GREEN_API_TOKEN', config.greenApi.token],
  ['OWNER_WHATSAPP', config.owner.whatsapp],
];

export function missingConfig(): string[] {
  return REQUIRED.filter(([, v]) => !v).map(([k]) => k);
}
