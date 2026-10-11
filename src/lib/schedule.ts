import type { BreakEntry, BreakKind, SlotStatus, TimelineItem } from "./types";

interface Slot {
  id: string;
  kind: BreakKind;
  minutes: number;
  label: string;
}

const hm = (h: number, m = 0) => h * 60 + m;

/** Today's default workday schedule: hourly desk stretches + three breathing resets. */
export const SCHEDULE: Slot[] = [
  { id: "b-0930", kind: "breathing", minutes: hm(9, 30), label: "4-7-8 breathing reset" },
  { id: "s-1000", kind: "stretch", minutes: hm(10), label: "Desk stretch" },
  { id: "s-1100", kind: "stretch", minutes: hm(11), label: "Desk stretch" },
  { id: "s-1200", kind: "stretch", minutes: hm(12), label: "Desk stretch" },
  { id: "b-1230", kind: "breathing", minutes: hm(12, 30), label: "4-7-8 breathing reset" },
  { id: "s-1300", kind: "stretch", minutes: hm(13), label: "Desk stretch" },
  { id: "s-1400", kind: "stretch", minutes: hm(14), label: "Desk stretch" },
  { id: "s-1500", kind: "stretch", minutes: hm(15), label: "Desk stretch" },
  { id: "b-1530", kind: "breathing", minutes: hm(15, 30), label: "4-7-8 breathing reset" },
  { id: "s-1600", kind: "stretch", minutes: hm(16), label: "Desk stretch" },
];

export const STRETCH_TARGET = SCHEDULE.filter((s) => s.kind === "stretch").length;
export const BREATHING_TARGET = SCHEDULE.filter((s) => s.kind === "breathing").length;

/** A slot stays "due" for this long after its start before it counts as missed. */
const GRACE_MIN = 30;

const fmt = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function countCompleted(breaks: BreakEntry[], kind: BreakKind): number {
  return breaks.filter((b) => b.kind === kind && b.completed).length;
}

/**
 * Completed sessions fill the day's slots of each kind in order, so doing a
 * break early "pre-pays" an upcoming slot and a late one rescues a missed slot.
 */
export function buildTimeline(breaks: BreakEntry[], nowMin: number): TimelineItem[] {
  const remaining: Record<BreakKind, number> = {
    stretch: countCompleted(breaks, "stretch"),
    breathing: countCompleted(breaks, "breathing"),
  };

  return SCHEDULE.map((slot) => {
    let status: SlotStatus;
    if (remaining[slot.kind] > 0) {
      remaining[slot.kind] -= 1;
      status = "completed";
    } else if (nowMin > slot.minutes + GRACE_MIN) {
      status = "missed";
    } else if (nowMin >= slot.minutes) {
      status = "due";
    } else {
      status = "upcoming";
    }
    return { ...slot, time: fmt(slot.minutes), status };
  });
}

export function slotsElapsed(nowMin: number, kind: BreakKind): number {
  return SCHEDULE.filter((s) => s.kind === kind && s.minutes <= nowMin).length;
}
