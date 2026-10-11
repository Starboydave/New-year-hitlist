"use client";

import Link from "next/link";
import { CheckCircle2, Circle, CircleAlert, CircleDashed, Pause, Play, Sparkles, Wind, Zap } from "lucide-react";
import { useWellness } from "@/context/WellnessContext";
import { formatClock } from "@/lib/dates";
import type { SlotStatus } from "@/lib/types";
import { btnGhost, btnPrimary, Card, Hydrating } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";

const INTERVALS = [
  { min: 60, label: "60 min (recommended)" },
  { min: 45, label: "45 min" },
  { min: 30, label: "30 min" },
  { min: 1, label: "1 min (demo)" },
];

export function Dashboard() {
  const w = useWellness();
  const greeting = w.now.getHours() < 12 ? "Good morning" : w.now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-fadeUp">
      <header className="mb-6">
        <p className="text-sm font-medium text-sage-700">
          {w.now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{greeting}. Let&apos;s keep your energy steady.</h1>
      </header>

      <Hydrating ready={w.hydrated}>
        <div className="grid gap-5 lg:grid-cols-5">
          <Card title="Energy Management Score" className="self-start lg:col-span-2">
            <div className="flex flex-col items-center gap-4">
              <ProgressRing value={w.score.value} label="Energy management score">
                <div>
                  <span className="block text-5xl font-semibold tabular-nums text-slate-900">{w.score.value}</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-sage-700">{w.score.label}</span>
                </div>
              </ProgressRing>
              <dl className="grid w-full grid-cols-3 gap-2 text-center text-xs text-slate-500">
                <ScorePart label="Stretch" value={w.score.parts.stretch} max={45} />
                <ScorePart label="Breathing" value={w.score.parts.breathing} max={25} />
                <ScorePart label="Recovery" value={w.score.parts.recovery} max={30} />
              </dl>
            </div>
          </Card>

          <div className="grid gap-5 lg:col-span-3">
            <Card title="Mobility Engine">
              <div className="flex flex-wrap items-center gap-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Next break in</p>
                  <p className="font-mono text-4xl font-semibold tabular-nums text-slate-900" aria-label={`${formatClock(w.remainingSec)} remaining`}>
                    {formatClock(w.remainingSec)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{w.paused ? "Paused — focus time is not counted" : "Tracking continuous focus time"}</p>
                </div>
                <div className="min-w-[10rem] flex-1">
                  <div
                    role="progressbar"
                    aria-label="Focus time until next break"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(w.progress * 100)}
                    className="h-2.5 overflow-hidden rounded-full bg-sage-100"
                  >
                    <div className="h-full rounded-full bg-sage-500 transition-[width] duration-1000 motion-reduce:transition-none" style={{ width: `${w.progress * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={w.togglePause} className={btnGhost} aria-pressed={w.paused}>
                  {w.paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
                  {w.paused ? "Resume" : "Pause"}
                </button>
                <button type="button" onClick={w.openBreak} className={btnPrimary}>
                  <Zap className="h-4 w-4" aria-hidden="true" /> Stretch now
                </button>
                <Link href="/breathe" className={btnGhost}>
                  <Wind className="h-4 w-4" aria-hidden="true" /> Breathe
                </Link>
                <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
                  <span>Interval</span>
                  <select
                    value={w.intervalMin}
                    onChange={(e) => w.setIntervalMin(Number(e.target.value))}
                    className="rounded-lg border border-sage-200 bg-white px-2 py-1.5 text-sm"
                  >
                    {INTERVALS.map((i) => (
                      <option key={i.min} value={i.min}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </Card>

            <Card title="Today's mobility timeline" id="timeline">
              <ol className="relative space-y-1">
                {w.timeline.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <StatusIcon status={item.status} />
                    <time className="w-12 font-mono text-sm tabular-nums text-slate-500">{item.time}</time>
                    <span className="flex-1 text-sm text-slate-800">
                      {item.kind === "breathing" ? <Wind className="mr-1.5 inline h-4 w-4 text-sage-500" aria-hidden="true" /> : <Sparkles className="mr-1.5 inline h-4 w-4 text-sage-500" aria-hidden="true" />}
                      {item.label}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </Hydrating>
    </div>
  );
}

const STATUS_LABEL: Record<SlotStatus, string> = { completed: "Done", missed: "Missed", due: "Due now", upcoming: "Upcoming" };
const STATUS_STYLE: Record<SlotStatus, string> = {
  completed: "bg-sage-100 text-sage-800",
  missed: "bg-slate-100 text-slate-600",
  due: "bg-sage-600 text-white",
  upcoming: "bg-white text-slate-500 ring-1 ring-slate-200",
};

function StatusIcon({ status }: { status: SlotStatus }) {
  const cls = "h-5 w-5 shrink-0";
  if (status === "completed") return <CheckCircle2 className={`${cls} text-sage-600`} aria-hidden="true" />;
  if (status === "missed") return <CircleDashed className={`${cls} text-slate-400`} aria-hidden="true" />;
  if (status === "due") return <CircleAlert className={`${cls} text-sage-700`} aria-hidden="true" />;
  return <Circle className={`${cls} text-slate-300`} aria-hidden="true" />;
}

function ScorePart({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="rounded-xl bg-sage-50 px-2 py-2">
      <dt>{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800">
        {Math.round(value)}
        <span className="font-normal text-slate-400"> / {max}</span>
      </dd>
    </div>
  );
}
