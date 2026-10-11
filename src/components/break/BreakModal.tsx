"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { CheckCheck, Clock, Wind, X } from "lucide-react";
import { useWellness } from "@/context/WellnessContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { pickProtocols } from "@/lib/protocols";
import { countCompleted } from "@/lib/schedule";
import { btnGhost, btnPrimary } from "@/components/ui/Card";
import { ProtocolCarousel } from "./ProtocolCarousel";

export function BreakModal() {
  const w = useWellness();
  if (!w.breakOpen) return null;
  return <BreakDialog />;
}

function BreakDialog() {
  const { today, snoozeBreak, skipStretch, completeStretch, closeBreak, intervalMin } = useWellness();
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  // Rotate which protocols are offered so consecutive breaks stay varied.
  const protocols = useMemo(() => pickProtocols(countCompleted(today.breaks, "stretch")), []); // eslint-disable-line react-hooks/exhaustive-deps
  const last = index === protocols.length - 1;

  useFocusTrap(ref, true, finished ? closeBreak : snoozeBreak);
  useEffect(() => {
    if (finished) ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [finished]);

  const finish = () => {
    completeStretch(protocols.map((p) => p.id));
    setFinished(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-title"
        aria-describedby="break-desc"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        {finished ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage-100 text-sage-700">
              <CheckCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 id="break-title" className="mt-4 text-xl font-semibold text-slate-900">Break complete</h2>
            <p id="break-desc" className="mt-1 text-sm text-slate-600">Your focus timer has been reset. Want to lock in the benefit with a minute of paced breathing?</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/breathe" onClick={closeBreak} className={btnPrimary}>
                <Wind className="h-4 w-4" aria-hidden="true" /> Try 4-7-8 breathing
              </Link>
              <button type="button" onClick={closeBreak} data-autofocus className={btnGhost}>Back to work</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-sage-700">{intervalMin} minutes of focus</p>
                <h2 id="break-title" className="text-xl font-semibold text-slate-900">Time to reset your posture</h2>
                <p id="break-desc" className="mt-1 text-sm text-slate-600">Four quick desk stretches — about three minutes, no equipment needed.</p>
              </div>
              <button type="button" onClick={snoozeBreak} aria-label="Snooze break" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <ProtocolCarousel protocols={protocols} index={index} onIndexChange={(i) => setIndex(Math.min(protocols.length - 1, Math.max(0, i)))} />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-sage-100 pt-4">
              <div className="flex gap-2">
                <button type="button" onClick={snoozeBreak} className={btnGhost}>
                  <Clock className="h-4 w-4" aria-hidden="true" /> Snooze
                </button>
                <button type="button" onClick={skipStretch} className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800">
                  Skip
                </button>
              </div>
              {last ? (
                <button type="button" onClick={finish} className={btnPrimary}>
                  <CheckCheck className="h-4 w-4" aria-hidden="true" /> I&apos;ve finished
                </button>
              ) : (
                <button type="button" onClick={() => setIndex(index + 1)} className={btnPrimary}>Next stretch</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
