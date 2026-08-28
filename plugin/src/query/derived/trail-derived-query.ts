import type { TrailTimestamp } from "../../domain/model/trail-values";
import {
  isTrailTerminalStatusDefinition,
  resolveTrailStatusDefinition,
} from "../../domain/rules/trail-status-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

export interface TrailMilestoneProgress {
  readonly completedIssueCount: number;
  readonly effectiveIssueCount: number;
}

function earliestIssueFirstStartedAt(
  readable: ReturnType<typeof selectTrailReadableRuntimeSnapshot>,
  issueIds: readonly string[],
): TrailTimestamp | undefined {
  let earliest: TrailTimestamp | undefined;

  for (const issueId of issueIds) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow" || issue.firstStartedAt === undefined) continue;
    if (earliest === undefined || issue.firstStartedAt < earliest) earliest = issue.firstStartedAt;
  }

  return earliest;
}

/**
 * Initiative completion follows the canonical Domain rule: it requires at least
 * one current Project, and every current Project must be Completed or Canceled.
 */
export function selectIsTrailInitiativeCompleted(
  state: TrailRuntimeState,
  initiativeId: string,
): boolean | undefined {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return undefined;
  if (!readable.authoritative.domain.initiativesById.has(initiativeId)) return undefined;

  const projectIds = readable.indexes.projectsByInitiativeId.get(initiativeId) ?? [];
  if (projectIds.length === 0) return false;

  for (const projectId of projectIds) {
    const project = readable.authoritative.domain.projectsById.get(projectId);
    if (project === undefined) return undefined;
    const status = resolveTrailStatusDefinition(
      configuration,
      "project",
      project.statusDefinitionId,
    );
    if (status === undefined) return undefined;
    if (!isTrailTerminalStatusDefinition(status)) return false;
  }

  return true;
}

/**
 * Milestone progress is current-scope aggregation only. It deliberately exposes
 * counts instead of inventing a persisted or page-local Milestone lifecycle.
 */
export function selectTrailMilestoneProgress(
  state: TrailRuntimeState,
  milestoneId: string,
): TrailMilestoneProgress | undefined {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return undefined;
  if (!readable.authoritative.domain.milestonesById.has(milestoneId)) return undefined;

  const issueIds = readable.indexes.issuesByMilestoneId.get(milestoneId) ?? [];
  let completedIssueCount = 0;
  let effectiveIssueCount = 0;
  for (const issueId of issueIds) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow") return undefined;
    const status = resolveTrailStatusDefinition(
      configuration,
      "issue",
      issue.statusDefinitionId,
    );
    if (status === undefined) return undefined;
    if (status.category === "canceled") continue;
    effectiveIssueCount += 1;
    if (status.category === "completed") completedIssueCount += 1;
  }

  if (effectiveIssueCount === 0) return undefined;
  return { completedIssueCount, effectiveIssueCount };
}

/**
 * Cycle Effort is a live projection over current member Estimate levels and the
 * current Workspace weight policy. Missing Estimate contributes nothing.
 */
export function selectTrailCycleEffort(
  state: TrailRuntimeState,
  cycleId: string,
): number | undefined {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return undefined;
  const cycle = readable.authoritative.domain.cyclesById.get(cycleId);
  if (cycle === undefined) return undefined;

  let effort = 0;
  for (const issueId of cycle.issueIds) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow") return undefined;
    if (issue.estimate !== undefined) {
      effort += configuration.estimateWeights[issue.estimate];
    }
  }
  return effort;
}

/** Current-scope activity start is the earliest first-start fact of its current Issues. */
export function selectTrailProjectActualStart(
  state: TrailRuntimeState,
  projectId: string,
): TrailTimestamp | undefined {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  return earliestIssueFirstStartedAt(
    readable,
    readable.indexes.issuesByProjectId.get(projectId) ?? [],
  );
}

/** Current-scope Milestone activity start uses only Issues currently assigned to it. */
export function selectTrailMilestoneActualStart(
  state: TrailRuntimeState,
  milestoneId: string,
): TrailTimestamp | undefined {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  return earliestIssueFirstStartedAt(
    readable,
    readable.indexes.issuesByMilestoneId.get(milestoneId) ?? [],
  );
}

/** Current-scope Initiative activity start spans Issues in its current Projects. */
export function selectTrailInitiativeActualStart(
  state: TrailRuntimeState,
  initiativeId: string,
): TrailTimestamp | undefined {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  let earliest: TrailTimestamp | undefined;

  for (const projectId of readable.indexes.projectsByInitiativeId.get(initiativeId) ?? []) {
    const projectStart = earliestIssueFirstStartedAt(
      readable,
      readable.indexes.issuesByProjectId.get(projectId) ?? [],
    );
    if (projectStart === undefined) continue;
    if (earliest === undefined || projectStart < earliest) earliest = projectStart;
  }

  return earliest;
}
