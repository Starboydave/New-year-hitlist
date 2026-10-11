/**
 * One-time helper: obtains the Google refresh token for Calendar + Sheets + Gmail drafts.
 *  1. Put GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env (OAuth client type: "Web application",
 *     authorised redirect URI: http://localhost:5555/oauth2callback)
 *  2. npm run google:token  → open the printed URL, sign in as the business owner, approve.
 *  3. Paste the printed refresh token into .env as GOOGLE_REFRESH_TOKEN.
 */
import http from 'http';
import { google } from 'googleapis';
import { config } from '../src/config';
import { GOOGLE_SCOPES } from '../src/services/googleAuth';

const REDIRECT = 'http://localhost:5555/oauth2callback';
const oauth = new google.auth.OAuth2(config.google.clientId, config.google.clientSecret, REDIRECT);

console.log('\nOpen this URL:\n\n' + oauth.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: GOOGLE_SCOPES }) + '\n');

http.createServer(async (req, res) => {
  const code = new URL(req.url ?? '', 'http://localhost:5555').searchParams.get('code');
  if (!code) return void res.end('No code');
  const { tokens } = await oauth.getToken(code);
  res.end('Done — return to the terminal.');
  console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
  process.exit(0);
}).listen(5555);
