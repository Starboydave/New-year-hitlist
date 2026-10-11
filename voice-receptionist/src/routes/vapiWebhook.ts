import { Request, Response, Router } from 'express';
import { log } from '../utils/logger';
import {
  extractToolCalls, ghostTransfer, handleToolCalls, verifyVapiSecret, VapiMessage,
} from '../services/vapiService';
import { recordEvent } from '../services/store';
import { toE164 } from '../utils/phone';
import { config } from '../config';

export const vapiRouter = Router();

/**
 * Single Server URL for every Vapi event. Keep this handler thin and fast:
 *  - tool-calls                 → handleToolCalls (800ms budget, Ghost Transfer on error/overrun)
 *  - transfer-destination-request → dynamic destination (used by the assistant's empty transferCall tool)
 *  - end-of-call-report         → count the call for the 6 PM briefing
 *  - everything else            → 200 immediately
 */
vapiRouter.post('/vapi-webhook', async (req: Request, res: Response) => {
  if (!verifyVapiSecret(req.header('x-vapi-secret'))) return void res.status(401).json({ error: 'unauthorized' });

  const m: VapiMessage | undefined = req.body?.message;
  if (!m?.type) return void res.status(400).json({ error: 'missing message.type' });

  try {
    switch (m.type) {
      case 'tool-calls':
        return void res.json(await handleToolCalls(m));

      case 'transfer-destination-request':
        // Used when the model calls the built-in transferCall tool (e.g. after our "transfer now" instruction).
        return void res.json({
          destination: {
            type: 'number',
            number: toE164(config.transfer.backupRingGroup),
            message: 'Connecting you now.',
            numberE164CheckEnabled: false,
          },
        });

      case 'end-of-call-report':
        recordEvent({ type: 'call', callId: m.call?.id });
        return void res.json({ ok: true });

      default:
        return void res.json({ ok: true });
    }
  } catch (err) {
    log.error('webhook crashed', err, { type: m.type });
    const ids = m.type === 'tool-calls' ? extractToolCalls(m).map((t) => t.id) : [];
    return void res.json(ghostTransfer(m, 'webhook-crash', ids));
  }
});
