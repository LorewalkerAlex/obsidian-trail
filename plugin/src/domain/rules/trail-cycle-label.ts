import type { TrailCycle } from "../model/trail-entities";
import { formatTrailCalendarDate } from "./trail-calendar-date";

export type TrailCycleLabelSource = Pick<TrailCycle, "endedAt" | "startedAt">;

/**
 * Cycle identity is derived from actual lifecycle facts, never the planned end.
 * Open Cycles identify their real start; Closed Cycles identify the actual span.
 */
export function formatTrailCycleLabel(
  cycle: TrailCycleLabelSource,
  timezone: string,
): string {
  const started = formatTrailCalendarDate(cycle.startedAt, timezone);
  return cycle.endedAt === undefined
    ? `Current: ${started}`
    : `${started} to ${formatTrailCalendarDate(cycle.endedAt, timezone)}`;
}
