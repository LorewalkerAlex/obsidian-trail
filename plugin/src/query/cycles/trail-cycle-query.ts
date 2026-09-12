import type {
  TrailCycle,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import type { TrailTimestamp } from "../../domain/model/trail-values";
import {
  isTrailTerminalStatusDefinition,
  resolveTrailStatusDefinition,
} from "../../domain/rules/trail-status-rules";
import type { TrailEffectiveRuntimeSnapshot } from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

function cyclePlanningIssueOrder(
  readable: TrailEffectiveRuntimeSnapshot,
  issue: TrailWorkflowIssue,
): readonly [string, string, string] {
  const projectTitle = issue.projectId === undefined
    ? ""
    : readable.authoritative.domain.projectsById.get(issue.projectId)?.title ?? issue.projectId;
  return [projectTitle, issue.title, issue.id];
}

function compareCyclePlanningIssues(
  readable: TrailEffectiveRuntimeSnapshot,
  left: TrailWorkflowIssue,
  right: TrailWorkflowIssue,
): number {
  const leftKey = cyclePlanningIssueOrder(readable, left);
  const rightKey = cyclePlanningIssueOrder(readable, right);
  for (let index = 0; index < leftKey.length; index += 1) {
    const delta = leftKey[index].localeCompare(rightKey[index]);
    if (delta !== 0) return delta;
  }
  return 0;
}

function isTerminalWorkflowIssue(
  readable: TrailEffectiveRuntimeSnapshot,
  issue: TrailWorkflowIssue,
): boolean {
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return false;
  const status = resolveTrailStatusDefinition(
    configuration,
    "issue",
    issue.statusDefinitionId,
  );
  return status !== undefined && isTrailTerminalStatusDefinition(status);
}

export type TrailClosedCycle = TrailCycle & { readonly endedAt: TrailTimestamp };

/** Shared newest-first history order for every Cycle history consumer. */
export function selectTrailClosedCyclesFromReadableSnapshot(
  readable: TrailEffectiveRuntimeSnapshot,
): readonly TrailClosedCycle[] {
  return [...readable.authoritative.domain.cyclesById.values()]
    .filter((cycle): cycle is TrailClosedCycle => cycle.endedAt !== undefined)
    .sort((left, right) => {
      const endedOrder = right.endedAt - left.endedAt;
      return endedOrder !== 0
        ? endedOrder
        : right.startedAt - left.startedAt || left.id.localeCompare(right.id);
    });
}

export function selectTrailReadableCycleById(
  state: TrailRuntimeState,
  cycleId: string,
): TrailCycle | undefined {
  return selectTrailReadableRuntimeSnapshot(state).authoritative.domain.cyclesById.get(cycleId);
}

/** Closed Cycle history is newest-first without persisting presentation rank. */
export function selectTrailCycleHistoryIds(
  state: TrailRuntimeState,
): readonly string[] {
  return selectTrailClosedCyclesFromReadableSnapshot(
    selectTrailReadableRuntimeSnapshot(state),
  ).map((cycle) => cycle.id);
}

/**
 * Planning candidates are all current non-terminal Workflow Issues plus any
 * terminal Issue already retained in the open Cycle's membership.
 */
export function selectTrailCyclePlanningIssueIds(
  state: TrailRuntimeState,
  currentCycleId?: string,
): readonly string[] {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const currentMembers = new Set(
    currentCycleId === undefined
      ? []
      : readable.authoritative.domain.cyclesById.get(currentCycleId)?.issueIds ?? [],
  );
  return [...readable.authoritative.domain.issuesById.values()]
    .filter((issue): issue is TrailWorkflowIssue => issue.context === "workflow")
    .filter((issue) => currentMembers.has(issue.id) || !isTerminalWorkflowIssue(readable, issue))
    .sort((left, right) => compareCyclePlanningIssues(readable, left, right))
    .map((issue) => issue.id);
}

/** Start-next candidates are current non-terminal members of the source Cycle. */
export function selectTrailNextCycleCandidateIssueIds(
  state: TrailRuntimeState,
  cycleId: string,
): readonly string[] {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const cycle = readable.authoritative.domain.cyclesById.get(cycleId);
  if (cycle === undefined || cycle.endedAt === undefined) return [];
  return cycle.issueIds
    .map((issueId) => readable.authoritative.domain.issuesById.get(issueId))
    .filter((issue): issue is TrailWorkflowIssue => issue?.context === "workflow")
    .filter((issue) => !isTerminalWorkflowIssue(readable, issue))
    .sort((left, right) => compareCyclePlanningIssues(readable, left, right))
    .map((issue) => issue.id);
}
