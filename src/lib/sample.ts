import { lastNDays } from "./dates";
import { BREATHING_TARGET, STRETCH_TARGET } from "./schedule";
import type { BreakEntry, DayRecord } from "./types";

/** Deterministic sample history so the analytics view is previewable on first run. */
export function sampleHistory(): Record<string, DayRecord> {
  const keys = lastNDays(7).slice(0, 6); // everything except today
  const stretchPattern = [5, 6, 7, 4, 6, 7];
  const breathPattern = [2, 3, 3, 1, 2, 3];
  const days: Record<string, DayRecord> = {};

  keys.forEach((key, i) => {
    const breaks: BreakEntry[] = [];
    for (let n = 0; n < Math.min(stretchPattern[i], STRETCH_TARGET); n++) {
      breaks.push({ id: `${key}-s${n}`, kind: "stretch", at: `${key}T${10 + n}:00:00`, completed: true });
    }
    for (let n = 0; n < Math.min(breathPattern[i], BREATHING_TARGET); n++) {
      breaks.push({ id: `${key}-b${n}`, kind: "breathing", at: `${key}T${9 + n * 3}:30:00`, completed: true });
    }
    days[key] = { breaks };
  });
  return days;
}
