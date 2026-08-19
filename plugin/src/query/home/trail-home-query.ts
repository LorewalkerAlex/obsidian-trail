import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

export interface TrailHomeCurrentCycleSummary {
  readonly id: string;
  readonly issueCount: number;
  readonly plannedEnd: number;
}

export interface TrailHomeSummary {
  readonly currentCycle?: TrailHomeCurrentCycleSummary;
  readonly initiativeCount: number;
  readonly projectCount: number;
}

/** Home is a read-only composition of existing Runtime facts, not a separate data system. */
export function selectTrailHomeSummary(state: TrailRuntimeState): TrailHomeSummary {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const currentCycleId = readable.indexes.currentCycleId;
  const currentCycle = currentCycleId === undefined
    ? undefined
    : readable.authoritative.domain.cyclesById.get(currentCycleId);
  return {
    ...(currentCycle === undefined ? {} : {
      currentCycle: {
        id: currentCycle.id,
        issueCount: currentCycle.issueIds.length,
        plannedEnd: currentCycle.plannedEnd,
      },
    }),
    initiativeCount: readable.authoritative.domain.initiativesById.size,
    projectCount: readable.authoritative.domain.projectsById.size,
  };
}
