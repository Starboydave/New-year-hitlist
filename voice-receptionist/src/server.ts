import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { config, missingConfig } from './config';
import { log } from './utils/logger';
import { vapiRouter } from './routes/vapiWebhook';
import { startCronJobs, runExecutiveBriefing } from './services/cronJobs';
import { prewarmGoogleAuth } from './services/googleAuth';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Browser test console (local use). Disabled in production.
if (!config.isProd) {
  app.use('/console', express.static(path.resolve(process.cwd(), 'public'), { index: 'console.html' }));
}

app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use('/api', vapiRouter);

// Manual trigger for the 6 PM briefing, for testing: curl -X POST -H "x-admin-token: …" /api/admin/run-briefing
app.post('/api/admin/run-briefing', async (req, res) => {
  const given = Buffer.from(req.header('x-admin-token') ?? '');
  const want = Buffer.from(config.adminToken);
  if (!config.adminToken || given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return void res.status(401).json({ error: 'unauthorized' });
  }
  try {
    res.json(await runExecutiveBriefing());
  } catch (err) {
    log.error('manual briefing failed', err);
    res.status(500).json({ error: 'briefing failed' });
  }
});

const missing = missingConfig();
if (missing.length) {
  const msg = `missing env vars: ${missing.join(', ')}`;
  if (config.isProd) {
    log.error(msg);
    process.exit(1);
  }
  log.warn(`${msg} — dependent features will fail (and Ghost Transfer will fire)`);
}

app.listen(config.port, () => {
  log.info(`voice-receptionist listening on :${config.port}`);
  startCronJobs();
  void prewarmGoogleAuth();
});
