type Meta = Record<string, unknown> | undefined;

const emit = (level: string, msg: string, meta?: Meta) =>
  console[level === 'error' ? 'error' : 'log'](
    JSON.stringify({ t: new Date().toISOString(), level, msg, ...meta }),
  );

export const log = {
  info: (msg: string, meta?: Meta) => emit('info', msg, meta),
  warn: (msg: string, meta?: Meta) => emit('warn', msg, meta),
  error: (msg: string, err?: unknown, meta?: Meta) =>
    emit('error', msg, { ...meta, err: err instanceof Error ? err.message : err }),
};
