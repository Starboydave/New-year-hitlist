/** Normalise a Nigerian (or international) phone number to digits with country code, e.g. 2348012345678. */
export function normalizePhone(raw: string | undefined | null): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  return digits;
}

export const toE164 = (raw: string): string => {
  const n = normalizePhone(raw);
  return n ? `+${n}` : '';
};

/**
 * Parse spoken/typed budgets: "50 million", "₦2.5b", "N150m", "50,000,000", "fifty million" (digits only).
 * Returns NGN or null if it can't be understood.
 */
export function parseBudgetNgn(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const s = raw.toLowerCase().replace(/[₦,\s]|ngn|naira|^n(?=\d)/g, '');
  const m = s.match(/^(\d+(?:\.\d+)?)(billion|bn|b|million|mil|m|thousand|k)?/);
  if (!m) return null;
  const mult: Record<string, number> = {
    billion: 1e9, bn: 1e9, b: 1e9, million: 1e6, mil: 1e6, m: 1e6, thousand: 1e3, k: 1e3,
  };
  return Math.round(Number(m[1]) * (m[2] ? mult[m[2]] : 1));
}

export const formatNgn = (n: number): string => `₦${n.toLocaleString('en-NG')}`;
