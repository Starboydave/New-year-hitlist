export type BreakKind = "stretch" | "breathing";

export interface BreakEntry {
  id: string;
  kind: BreakKind;
  /** ISO timestamp of when the break was completed / skipped. */
  at: string;
  completed: boolean;
  protocolIds?: string[];
}

export interface DayRecord {
  breaks: BreakEntry[];
}

export interface PersistedState {
  version: 1;
  intervalMin: number;
  days: Record<string, DayRecord>;
  /** Focus seconds accumulated since the last break. */
  sinceBreakSec: number;
}

export type SlotStatus = "completed" | "missed" | "due" | "upcoming";

export interface TimelineItem {
  id: string;
  kind: BreakKind;
  time: string;
  minutes: number;
  label: string;
  status: SlotStatus;
}
