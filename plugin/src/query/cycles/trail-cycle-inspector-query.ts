import type { TrailCycle } from "../../domain/model/trail-entities";
import type { TrailTimestamp } from "../../domain/model/trail-values";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import type { TrailProgressReadModel } from "../shared/trail-progress-query";
import { selectTrailCyclePageReadModel } from "./trail-cycle-page-query";

interface TrailCycleInspectorReadModelBase {
  readonly effort: number;
  readonly expectedCycle: TrailCycle;
  readonly id: string;
  readonly issueCount: number;
  readonly plannedEnd: TrailTimestamp;
  readonly startedAt: TrailTimestamp;
  readonly timezone: string;
}

export interface TrailCurrentCycleInspectorReadModel extends TrailCycleInspectorReadModelBase {
  readonly kind: "current";
  readonly progress: TrailProgressReadModel;
  readonly unfinishedIssueCount: number;
}

export interface TrailHistoricalCycleInspectorReadModel extends TrailCycleInspectorReadModelBase {
  readonly endedAt: TrailTimestamp;
  readonly kind: "historical";
}

export type TrailCycleInspectorReadModel =
  | TrailCurrentCycleInspectorReadModel
  | TrailHistoricalCycleInspectorReadModel;

export function selectTrailCycleInspectorReadModel(
  state: TrailRuntimeState,
  cycleId: string,
): TrailCycleInspectorReadModel | null {
  const page = selectTrailCyclePageReadModel(state, cycleId);
  if (page === null) return null;

  const base = {
    effort: page.cycle.effort,
    expectedCycle: page.expectedCycle,
    id: page.cycle.id,
    issueCount: page.cycle.issueCount,
    plannedEnd: page.cycle.plannedEnd,
    startedAt: page.cycle.startedAt,
    timezone: page.configuration.temporal.timezone,
  } as const;

  if (page.kind === "historical") {
    return {
      ...base,
      endedAt: page.cycle.endedAt,
      kind: "historical",
    };
  }

  const unfinishedIssueCount = page.sections.reduce((count, section) => (
    section.category === "completed" || section.category === "canceled"
      ? count
      : count + section.issues.length
  ), 0);

  return {
    ...base,
    kind: "current",
    progress: page.cycle.progress,
    unfinishedIssueCount,
  };
}
