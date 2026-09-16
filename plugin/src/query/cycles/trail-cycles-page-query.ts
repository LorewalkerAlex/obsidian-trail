import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailCycle } from "../../domain/model/trail-entities";
import {
  resolveTrailCycleDefaultEndDate,
  type TrailCalendarDate,
} from "../../domain/rules/trail-temporal-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";
import {
  createTrailWorkflowIssuePresentationProjector,
  type TrailWorkflowIssuePresentationReadModel,
} from "../shared/trail-workflow-issue-presentation-query";
import {
  selectTrailCyclePlanningIssueIdsFromReadableSnapshot,
  selectTrailNextCycleCandidateIssueIdsFromReadableSnapshot,
} from "./trail-cycle-query";
import {
  selectTrailCyclesIndexReadModel,
  type TrailCyclesIndexReadModel,
} from "./trail-cycle-page-query";

export interface TrailCyclesPageReadModel extends TrailCyclesIndexReadModel {
  readonly canStart: boolean;
  readonly suggestedPlannedEndDate?: TrailCalendarDate;
}

export interface TrailCycleStartReadModel {
  readonly canStart: boolean;
  readonly candidates: readonly TrailWorkflowIssuePresentationReadModel[];
  readonly configuration: TrailConfiguration;
  readonly expectedSourceCycle?: TrailCycle;
  readonly initialIssueIds: readonly string[];
  readonly suggestedPlannedEndDate?: TrailCalendarDate;
}

export function selectTrailCyclesPageReadModel(
  state: TrailRuntimeState,
  now: number,
): TrailCyclesPageReadModel | null {
  const index = selectTrailCyclesIndexReadModel(state);
  if (index === null) return null;

  const canStart = index.current === undefined && state.control.kind === "ready";
  return {
    ...index,
    canStart,
    suggestedPlannedEndDate: index.current === undefined
      ? resolveTrailCycleDefaultEndDate(
          now,
          index.configuration.temporal.timezone,
          index.configuration.cycle.defaultEndRule,
        )
      : undefined,
  };
}

/**
 * Start Cycle is one Page-local flow for both ordinary Start and Start-next.
 * Start-next plans while its source is still the current open Cycle.
 */
export function selectTrailCycleStartReadModel(
  state: TrailRuntimeState,
  now: number,
  sourceCycleId?: string,
): TrailCycleStartReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  let expectedSourceCycle: TrailCycle | undefined;
  if (sourceCycleId !== undefined) {
    const sourceCycle = readable.authoritative.domain.cyclesById.get(sourceCycleId);
    if (
      sourceCycle === undefined
      || sourceCycle.endedAt !== undefined
      || readable.indexes.currentCycleId !== sourceCycleId
    ) return null;
    expectedSourceCycle = sourceCycle;
  }

  const candidateIds = selectTrailCyclePlanningIssueIdsFromReadableSnapshot(readable);
  const projector = createTrailWorkflowIssuePresentationProjector(readable);
  if (projector === null) return null;
  const candidates: TrailWorkflowIssuePresentationReadModel[] = [];
  for (const issueId of candidateIds) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow") return null;
    const presentation = projector(issue);
    if (presentation === null) return null;
    candidates.push(presentation);
  }

  const canStart = state.control.kind === "ready" && (
    sourceCycleId === undefined
      ? readable.indexes.currentCycleId === undefined
      : readable.indexes.currentCycleId === sourceCycleId
  );
  return {
    canStart,
    candidates,
    configuration,
    expectedSourceCycle,
    initialIssueIds: sourceCycleId === undefined
      ? []
      : selectTrailNextCycleCandidateIssueIdsFromReadableSnapshot(readable, sourceCycleId),
    suggestedPlannedEndDate: canStart
      ? resolveTrailCycleDefaultEndDate(
          now,
          configuration.temporal.timezone,
          configuration.cycle.defaultEndRule,
        )
      : undefined,
  };
}
