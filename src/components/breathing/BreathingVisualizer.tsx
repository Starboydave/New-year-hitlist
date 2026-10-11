"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Square } from "lucide-react";
import { useWellness } from "@/context/WellnessContext";
import { btnGhost, btnPrimary } from "@/components/ui/Card";

type Phase = "idle" | "inhale" | "hold" | "exhale" | "done";

const INHALE = 4;
const HOLD = 7;
const EXHALE = 8;
const CYCLE = INHALE + HOLD + EXHALE;
const CYCLE_OPTIONS = [2, 4, 6];

const COPY: Record<Phase, string> = {
  idle: "Ready",
  inhale: "Breathe in",
  hold: "Hold",
  exhale: "Breathe out",
  done: "Well done",
};

function locate(elapsed: number): { phase: Phase; left: number; cycle: number } {
  const cycle = Math.floor(elapsed / CYCLE);
  const t = elapsed - cycle * CYCLE;
  if (t < INHALE) return { phase: "inhale", left: INHALE - t, cycle };
  if (t < INHALE + HOLD) return { phase: "hold", left: INHALE + HOLD - t, cycle };
  return { phase: "exhale", left: CYCLE - t, cycle };
}

export function BreathingVisualizer() {
  const { recordBreathing } = useWellness();
  const [cycles, setCycles] = useState(4);
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [runId, setRunId] = useState(0);
  const startRef = useRef(0);

  const running = phase === "inhale" || phase === "hold" || phase === "exhale";

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      if (elapsed >= cycles * CYCLE) {
        window.clearInterval(id);
        setPhase("done");
        setLeft(0);
        recordBreathing();
        return;
      }
      const s = locate(elapsed);
      setPhase((p) => (p === s.phase ? p : s.phase));
      setLeft(s.left);
      setCycle(s.cycle);
    }, 100);
    return () => window.clearInterval(id);
  }, [running, cycles, recordBreathing]);

  const start = () => {
    startRef.current = performance.now();
    setCycle(0);
    setLeft(INHALE);
    setPhase("inhale");
    setRunId((n) => n + 1);
  };
  const stop = () => setPhase("idle");

  const animating = running;

  return (
    <div className="flex flex-col items-center">
      <div className="relative grid h-72 w-72 place-items-center sm:h-80 sm:w-80" aria-hidden="true">
        {/* static guide ring marks the full-inhale size */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-sage-200" />
        <div
          key={runId}
          data-phase={phase}
          className="breath-orb absolute inset-0 rounded-full bg-gradient-to-br from-sage-200 to-sage-400/70 shadow-[0_0_80px_rgba(98,132,100,0.35)]"
          style={animating ? { animationIterationCount: cycles } : { animation: "none" }}
        />
        <div className="relative z-10 text-center">
          <p className="text-2xl font-semibold text-slate-800">{COPY[phase]}</p>
          <p className="mt-1 font-mono text-4xl tabular-nums text-sage-800">{running ? Math.ceil(left) : phase === "done" ? "✓" : "4·7·8"}</p>
        </div>
      </div>

      {/* Screen-reader announcements (phase changes only, not every tick) */}
      <p className="sr-only" role="status" aria-live="polite">
        {phase === "idle" ? "" : `${COPY[phase]}${running ? `, cycle ${cycle + 1} of ${cycles}` : ""}`}
      </p>

      <p className="mt-6 text-sm text-slate-600" aria-hidden={!running}>
        {running ? `Cycle ${cycle + 1} of ${cycles}` : phase === "done" ? `${cycles} cycles complete and logged to your analytics.` : "Inhale 4 seconds · hold 7 · exhale 8"}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {running ? (
          <button type="button" onClick={stop} className={btnGhost}>
            <Square className="h-4 w-4" aria-hidden="true" /> Stop
          </button>
        ) : (
          <button type="button" onClick={start} className={btnPrimary}>
            {phase === "done" ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {phase === "done" ? "Go again" : "Begin session"}
          </button>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Cycles
          <select
            value={cycles}
            disabled={running}
            onChange={(e) => setCycles(Number(e.target.value))}
            className="rounded-lg border border-sage-200 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
          >
            {CYCLE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c} (~{Math.round((c * CYCLE) / 60 * 10) / 10} min)
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
