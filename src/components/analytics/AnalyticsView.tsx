"use client";

import { Flame, Trash2, Wind, Sparkles, Database } from "lucide-react";
import { useWellness } from "@/context/WellnessContext";
import { dayKey, lastNDays, shortWeekday } from "@/lib/dates";
import { BREATHING_TARGET, STRETCH_TARGET } from "@/lib/schedule";
import { dayCompliance, streak } from "@/lib/score";
import { btnGhost, Card, Hydrating } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";

export function AnalyticsView() {
  const { hydrated, now, days, compliance: c, today, loadSample, resetAll } = useWellness();
  const keys = lastNDays(7, now);
  const todayKey = dayKey(now);
  const series = keys.map((k) => ({ key: k, pct: Math.round(dayCompliance(days[k]) * 100) }));
  const weekAvg = Math.round(series.reduce((a, s) => a + s.pct, 0) / series.length);
  const run = streak(keys, days);
  const overall = Math.round(c.overall * 100);
  const log = [...today.breaks].reverse();

  return (
    <div className="animate-fadeUp">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Protocol compliance</h1>
        <p className="mt-1 text-sm text-slate-600">How consistently you&apos;re following your stretching and breathing protocols.</p>
      </header>

      <Hydrating ready={hydrated}>
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="Today" className="md:col-span-1">
            <div className="flex flex-col items-center gap-5">
              <ProgressRing value={overall} size={150} stroke={12} label="Today's compliance rate">
                <div>
                  <span className="text-4xl font-semibold tabular-nums text-slate-900">{overall}%</span>
                  <span className="block text-xs text-slate-500">on track</span>
                </div>
              </ProgressRing>
              <div className="w-full space-y-4">
                <Bar icon={<Sparkles className="h-4 w-4" aria-hidden="true" />} label="Desk stretches" done={c.stretchDone} expected={c.stretchExpected} target={STRETCH_TARGET} pct={c.stretchRate} />
                <Bar icon={<Wind className="h-4 w-4" aria-hidden="true" />} label="Breathing sessions" done={c.breathingDone} expected={c.breathingExpected} target={BREATHING_TARGET} pct={c.breathingRate} />
              </div>
            </div>
          </Card>

          <Card title="Last 7 days" className="md:col-span-2" action={<span className="text-sm text-slate-500">Avg {weekAvg}%</span>}>
            <div className="flex h-48 items-end gap-2 sm:gap-3" role="list" aria-label="Daily compliance, last 7 days">
              {series.map((s) => (
                <div key={s.key} role="listitem" aria-label={`${shortWeekday(s.key)}: ${s.pct}% compliance`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs tabular-nums text-slate-500">{s.pct}%</span>
                  <div className="flex w-full flex-1 items-end rounded-xl bg-sage-50">
                    <div
                      className={`w-full rounded-xl transition-[height] duration-700 motion-reduce:transition-none ${s.key === todayKey ? "bg-sage-600" : "bg-sage-300"}`}
                      style={{ height: `${Math.max(s.pct, 2)}%` }}
                    />
                  </div>
                  <span className={`text-xs ${s.key === todayKey ? "font-semibold text-slate-900" : "text-slate-500"}`}>{s.key === todayKey ? "Today" : shortWeekday(s.key)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-sage-50 px-4 py-3 text-sm text-slate-700">
              <Flame className="h-5 w-5 text-sage-600" aria-hidden="true" />
              <span>
                <strong className="font-semibold">{run}-day streak</strong> of 70%+ compliance
              </span>
            </div>
          </Card>

          <Card title="Today's activity log" className="md:col-span-3">
            {log.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing logged yet. Complete a stretch break or a breathing session and it will appear here.</p>
            ) : (
              <ul className="divide-y divide-sage-100">
                {log.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <time className="w-20 shrink-0 whitespace-nowrap font-mono tabular-nums text-slate-500">{new Date(b.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                    <span className="flex-1 text-slate-800">{b.kind === "stretch" ? "Desk stretch protocol" : "4-7-8 breathing"}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.completed ? "bg-sage-100 text-sage-800" : "bg-slate-100 text-slate-600"}`}>{b.completed ? "Completed" : "Skipped"}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex flex-wrap gap-3 border-t border-sage-100 pt-4">
              <button type="button" onClick={loadSample} className={btnGhost}>
                <Database className="h-4 w-4" aria-hidden="true" /> Load sample history
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  if (window.confirm("Clear all saved Ergo TMS data on this device?")) resetAll();
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Reset data
              </button>
            </div>
          </Card>
        </div>
      </Hydrating>
    </div>
  );
}

function Bar({ icon, label, done, expected, target, pct }: { icon: React.ReactNode; label: string; done: number; expected: number; target: number; pct: number }) {
  const p = Math.round(pct * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-700">
          <span className="text-sage-600">{icon}</span>
          {label}
        </span>
        <span className="tabular-nums text-slate-500">
          {done}/{target} <span className="text-xs">({expected} due so far)</span>
        </span>
      </div>
      <div role="progressbar" aria-label={`${label} compliance`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} className="h-2.5 overflow-hidden rounded-full bg-sage-100">
        <div className="h-full rounded-full bg-sage-500 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
