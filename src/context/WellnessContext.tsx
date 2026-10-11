"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMobilityTimer } from "@/hooks/useMobilityTimer";
import { useNow } from "@/hooks/useNow";
import { dayKey, minutesOfDay } from "@/lib/dates";
import { sampleHistory } from "@/lib/sample";
import { buildTimeline } from "@/lib/schedule";
import { energyScore, todayCompliance, type Compliance, type EnergyScore } from "@/lib/score";
import { clearState, DEFAULT_STATE, loadState, saveState } from "@/lib/storage";
import type { BreakEntry, BreakKind, DayRecord, TimelineItem } from "@/lib/types";

interface WellnessValue {
  hydrated: boolean;
  now: Date;
  days: Record<string, DayRecord>;
  today: DayRecord;
  timeline: TimelineItem[];
  compliance: Compliance;
  score: EnergyScore;
  // mobility engine
  intervalMin: number;
  setIntervalMin: (min: number) => void;
  elapsedSec: number;
  remainingSec: number;
  progress: number;
  paused: boolean;
  togglePause: () => void;
  breakOpen: boolean;
  openBreak: () => void;
  snoozeBreak: () => void;
  completeStretch: (protocolIds: string[]) => void;
  skipStretch: () => void;
  closeBreak: () => void;
  recordBreathing: () => void;
  // data
  loadSample: () => void;
  resetAll: () => void;
}

const WellnessContext = createContext<WellnessValue | null>(null);

const newEntry = (kind: BreakKind, completed: boolean, protocolIds?: string[]): BreakEntry => ({
  id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  kind,
  at: new Date().toISOString(),
  completed,
  protocolIds,
});

export function WellnessProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [days, setDays] = useState<Record<string, DayRecord>>({});
  const [intervalMin, setIntervalMinState] = useState(DEFAULT_STATE.intervalMin);
  const [paused, setPaused] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const now = useNow();

  const thresholdSec = intervalMin * 60;
  const openBreak = useCallback(() => setBreakOpen(true), []);

  const timer = useMobilityTimer({
    thresholdSec,
    enabled: hydrated && !paused && !breakOpen,
    onThreshold: openBreak,
  });
  const { seed, reset } = timer;

  // Hydrate from localStorage once on the client.
  useEffect(() => {
    const saved = loadState();
    setDays(saved.days);
    setIntervalMinState(saved.intervalMin);
    seed(saved.sinceBreakSec);
    setHydrated(true);
  }, [seed]);

  // Persist (elapsed time is checkpointed every 5s to avoid constant writes).
  const checkpoint = Math.floor(timer.elapsedSec / 5);
  useEffect(() => {
    if (!hydrated) return;
    saveState({ version: 1, intervalMin, days, sinceBreakSec: Math.floor(timer.elapsedSec) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, intervalMin, days, checkpoint]);

  const addEntry = useCallback((entry: BreakEntry) => {
    const key = dayKey(new Date());
    setDays((prev) => ({ ...prev, [key]: { breaks: [...(prev[key]?.breaks ?? []), entry] } }));
  }, []);

  const completeStretch = useCallback(
    (protocolIds: string[]) => {
      addEntry(newEntry("stretch", true, protocolIds));
      reset();
    },
    [addEntry, reset],
  );

  const skipStretch = useCallback(() => {
    addEntry(newEntry("stretch", false));
    reset();
    setBreakOpen(false);
  }, [addEntry, reset]);

  const snoozeBreak = useCallback(() => {
    const snoozeSec = Math.min(600, thresholdSec / 2);
    seed(thresholdSec - snoozeSec);
    setBreakOpen(false);
  }, [seed, thresholdSec]);

  const closeBreak = useCallback(() => setBreakOpen(false), []);
  const recordBreathing = useCallback(() => addEntry(newEntry("breathing", true)), [addEntry]);
  const togglePause = useCallback(() => setPaused((p) => !p), []);

  const setIntervalMin = useCallback(
    (min: number) => {
      setIntervalMinState(min);
      reset();
    },
    [reset],
  );

  const loadSample = useCallback(() => {
    setDays((prev) => ({ ...sampleHistory(), ...prev }));
  }, []);

  const resetAll = useCallback(() => {
    clearState();
    setDays({});
    setIntervalMinState(DEFAULT_STATE.intervalMin);
    reset();
    setPaused(false);
  }, [reset]);

  const today = days[dayKey(now)] ?? { breaks: [] };
  const nowMin = minutesOfDay(now);

  const derived = useMemo(() => {
    const compliance = todayCompliance(today.breaks, nowMin);
    return {
      compliance,
      timeline: buildTimeline(today.breaks, nowMin),
      score: energyScore(compliance, timer.elapsedSec, intervalMin),
    };
  }, [today.breaks, nowMin, timer.elapsedSec, intervalMin]);

  const value: WellnessValue = {
    hydrated,
    now,
    days,
    today,
    ...derived,
    intervalMin,
    setIntervalMin,
    elapsedSec: timer.elapsedSec,
    remainingSec: timer.remainingSec,
    progress: timer.progress,
    paused,
    togglePause,
    breakOpen,
    openBreak,
    snoozeBreak,
    completeStretch,
    skipStretch,
    closeBreak,
    recordBreathing,
    loadSample,
    resetAll,
  };

  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
}

export function useWellness(): WellnessValue {
  const ctx = useContext(WellnessContext);
  if (!ctx) throw new Error("useWellness must be used inside <WellnessProvider>");
  return ctx;
}
