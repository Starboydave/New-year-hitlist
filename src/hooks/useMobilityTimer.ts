"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Focus seconds that must accumulate before a break is triggered. */
  thresholdSec: number;
  /** When false the timer is frozen (paused, modal open, or not yet hydrated). */
  enabled: boolean;
  onThreshold: () => void;
}

/**
 * Tracks continuous focus time. Counts only while the tab is visible, uses wall-clock
 * deltas (so throttled timers don't drift) and caps each delta so a laptop sleeping
 * doesn't register as hours of focus.
 */
export function useMobilityTimer({ thresholdSec, enabled, onThreshold }: Options) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const onThresholdRef = useRef(onThreshold);

  useEffect(() => {
    onThresholdRef.current = onThreshold;
  }, [onThreshold]);

  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      if (document.visibilityState !== "visible") return;
      setElapsedSec((prev) => prev + Math.min(delta, 5));
    }, 1000);
    return () => window.clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    if (enabled && elapsedSec >= thresholdSec) onThresholdRef.current();
  }, [enabled, elapsedSec, thresholdSec]);

  const reset = useCallback(() => setElapsedSec(0), []);
  const seed = useCallback((sec: number) => setElapsedSec(Math.max(0, sec)), []);

  return {
    elapsedSec,
    remainingSec: Math.max(0, thresholdSec - elapsedSec),
    progress: Math.min(1, elapsedSec / thresholdSec),
    reset,
    seed,
  };
}
