import { BREATHING_TARGET, STRETCH_TARGET, countCompleted, slotsElapsed } from "./schedule";
import type { BreakEntry, DayRecord } from "./types";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface Compliance {
  stretchDone: number;
  breathingDone: number;
  stretchExpected: number;
  breathingExpected: number;
  stretchRate: number; // 0..1
  breathingRate: number; // 0..1
  overall: number; // 0..1
}

/** Time-aware compliance for today: measured against slots that have already started. */
export function todayCompliance(breaks: BreakEntry[], nowMin: number): Compliance {
  const stretchDone = countCompleted(breaks, "stretch");
  const breathingDone = countCompleted(breaks, "breathing");
  const stretchExpected = slotsElapsed(nowMin, "stretch");
  const breathingExpected = slotsElapsed(nowMin, "breathing");
  const stretchRate = stretchExpected === 0 ? 1 : clamp01(stretchDone / stretchExpected);
  const breathingRate = breathingExpected === 0 ? 1 : clamp01(breathingDone / breathingExpected);
  const expected = stretchExpected + breathingExpected;
  const overall =
    expected === 0
      ? 1
      : clamp01((Math.min(stretchDone, stretchExpected) + Math.min(breathingDone, breathingExpected)) / expected);
  return { stretchDone, breathingDone, stretchExpected, breathingExpected, stretchRate, breathingRate, overall };
}

/** Full-day compliance (used for past days in the 7-day trend). */
export function dayCompliance(record: DayRecord | undefined): number {
  if (!record) return 0;
  const s = Math.min(countCompleted(record.breaks, "stretch"), STRETCH_TARGET);
  const b = Math.min(countCompleted(record.breaks, "breathing"), BREATHING_TARGET);
  return (s + b) / (STRETCH_TARGET + BREATHING_TARGET);
}

export interface EnergyScore {
  value: number;
  label: string;
  parts: { stretch: number; breathing: number; recovery: number };
}

/**
 * Energy Management Score (0–100):
 *   45 pts  stretch compliance
 *   25 pts  breathing compliance
 *   30 pts  recovery — drains as continuous focus time approaches 1.5× the break interval
 */
export function energyScore(c: Compliance, sinceBreakSec: number, intervalMin: number): EnergyScore {
  const stretch = 45 * c.stretchRate;
  const breathing = 25 * c.breathingRate;
  const recovery = 30 * (1 - clamp01(sinceBreakSec / (intervalMin * 60 * 1.5)));
  const value = Math.round(stretch + breathing + recovery);
  const label = value >= 85 ? "Peak energy" : value >= 65 ? "Well balanced" : value >= 45 ? "Running low" : "Needs a reset";
  return { value, label, parts: { stretch, breathing, recovery } };
}

/** Consecutive days (ending today or yesterday) at or above the threshold. */
export function streak(keys: string[], days: Record<string, DayRecord>, threshold = 0.7): number {
  let count = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    const ok = dayCompliance(days[keys[i]]) >= threshold;
    if (ok) count++;
    else if (i !== keys.length - 1) break; // today may still be in progress
  }
  return count;
}
