const TZ = 'Africa/Lagos';
/** Lagos is UTC+1 year-round (no DST), so fixed-offset maths is safe. */
export const LAGOS_OFFSET_MS = 60 * 60 * 1000;

/** YYYY-MM-DD in Lagos for a timestamp. */
export function lagosDayKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ms));
}

export function formatLagos(ms: number, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...opts,
  }).format(new Date(ms));
}

/** Lagos wall-clock components of a timestamp. */
export function lagosParts(ms: number) {
  const d = new Date(ms + LAGOS_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/** Timestamp for a Lagos wall-clock time. */
export function fromLagos(year: number, month: number, day: number, hour: number, minute = 0): number {
  return Date.UTC(year, month, day, hour, minute) - LAGOS_OFFSET_MS;
}
