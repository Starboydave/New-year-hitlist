"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Timer } from "lucide-react";
import type { StretchProtocol } from "@/lib/protocols";
import { formatClock } from "@/lib/dates";
import { btnGhost } from "@/components/ui/Card";

interface Props {
  protocols: StretchProtocol[];
  index: number;
  onIndexChange: (i: number) => void;
}

export function ProtocolCarousel({ protocols, index, onIndexChange }: Props) {
  const p = protocols[index];
  const Icon = p.icon;
  const [left, setLeft] = useState<number | null>(null);

  // Reset the practice timer when the slide changes.
  useEffect(() => setLeft(null), [index]);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const id = window.setTimeout(() => setLeft((l) => (l === null ? l : l - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  return (
    <div role="group" aria-roledescription="carousel" aria-label="Desk stretch protocols">
      <div role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${protocols.length}: ${p.title}`} aria-live="polite" className="animate-fadeUp rounded-2xl bg-sage-50 p-5" key={p.id}>
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-sage-600 shadow-sm">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-sage-700">{p.area}</p>
            <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{p.summary}</p>
          </div>
        </div>
        <ol className="mt-4 space-y-2.5">
          {p.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-sage-700">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Tip: </span>
          {p.tip}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" className={btnGhost} onClick={() => setLeft(p.durationSec)} disabled={left !== null && left > 0}>
            <Timer className="h-4 w-4" aria-hidden="true" />
            {left === null ? `Start ${p.durationSec}s guide` : left > 0 ? formatClock(left) : "Done — nice work"}
          </button>
          <span className="sr-only" role="status">
            {left === 0 ? "Timer finished" : ""}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" className={btnGhost} onClick={() => onIndexChange(index - 1)} disabled={index === 0} aria-label="Previous protocol">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <div className="flex gap-2" role="tablist" aria-label="Choose protocol">
          {protocols.map((pr, i) => (
            <button
              key={pr.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Protocol ${i + 1}: ${pr.title}`}
              onClick={() => onIndexChange(i)}
              className={`h-2.5 rounded-full transition-all ${i === index ? "w-6 bg-sage-600" : "w-2.5 bg-sage-200 hover:bg-sage-300"}`}
            />
          ))}
        </div>
        <button type="button" className={btnGhost} onClick={() => onIndexChange(index + 1)} disabled={index === protocols.length - 1} aria-label="Next protocol">
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
