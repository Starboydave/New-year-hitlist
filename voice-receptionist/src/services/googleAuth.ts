import { google } from 'googleapis';
import { config } from '../config';
import { log } from '../utils/logger';

/**
 * One OAuth2 client (the business owner's account) powers Calendar, Sheets and Gmail.
 * Scopes required when generating the refresh token:
 *   calendar.events, calendar.freebusy (or calendar), spreadsheets, gmail.compose
 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.compose',
];

let client: InstanceType<typeof google.auth.OAuth2> | null = null;

export function googleAuth() {
  if (!client) {
    client = new google.auth.OAuth2(config.google.clientId, config.google.clientSecret);
    client.setCredentials({ refresh_token: config.google.refreshToken });
  }
  return client;
}

export const calendarApi = () => google.calendar({ version: 'v3', auth: googleAuth() });
export const sheetsApi = () => google.sheets({ version: 'v4', auth: googleAuth() });
export const gmailApi = () => google.gmail({ version: 'v1', auth: googleAuth() });

/** Fetch an access token at boot so the first live call doesn't pay the token-refresh round trip. */
export async function prewarmGoogleAuth() {
  if (!config.google.refreshToken) return;
  try {
    await googleAuth().getAccessToken();
    log.info('google auth warmed');
  } catch (err) {
    log.error('google auth prewarm failed', err);
  }
}
