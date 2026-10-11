import type { PersistedState } from "./types";

const KEY = "ergo-tms:v1";

export const DEFAULT_STATE: PersistedState = {
  version: 1,
  intervalMin: 60,
  days: {},
  sinceBreakSec: 0,
};

export function loadState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: PersistedState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode / quota) — app keeps working in memory */
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
