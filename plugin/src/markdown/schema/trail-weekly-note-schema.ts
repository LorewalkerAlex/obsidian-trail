/** Canonical structured shape of the non-Domain Weekly Note Markdown utility. */
export interface TrailWeeklyNoteArchiveEntry {
  readonly content: string;
  readonly date: string;
}

export interface TrailWeeklyNoteSnapshot {
  readonly archives: readonly TrailWeeklyNoteArchiveEntry[];
  readonly current: string;
}
