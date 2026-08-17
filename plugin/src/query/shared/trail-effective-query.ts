import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type {
  TrailProject,
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  TRAIL_PRIORITIES,
  TRAIL_STATUS_CATEGORIES,
  type TrailPriority,
  type TrailStatusCategory,
} from "../../domain/model/trail-values";
import { resolveTrailStatusDefinition } from "../../domain/rules/trail-status-rules";
import {
  projectTrailEffectiveRuntimeSnapshot,
  type TrailEffectiveRuntimeSnapshot,
} from "../../runtime/projection/trail-runtime-projection";
import type {
  TrailAuthoritativeState,
  TrailRuntimeState,
} from "../../runtime/store/trail-runtime-store";

const PRIORITY_ORDER = new Map<TrailPriority, number>(
  TRAIL_PRIORITIES.map((priority, index) => [priority, index]),
);
const STATUS_CATEGORY_ORDER = new Map<TrailStatusCategory, number>(
  TRAIL_STATUS_CATEGORIES.map((category, index) => [category, index]),
);

/**
 * Read consumers use optimistic authoritative state and indexes only while Trail
 * is writable. Refresh/recovery falls back to one coherent committed snapshot.
 */
export function selectTrailReadableRuntimeSnapshot(
  state: TrailRuntimeState,
): TrailEffectiveRuntimeSnapshot {
  return state.control.kind === "ready"
    ? projectTrailEffectiveRuntimeSnapshot(state)
    : state.committed;
}

export function selectTrailReadableAuthoritativeState(
  state: TrailRuntimeState,
): TrailAuthoritativeState {
  return selectTrailReadableRuntimeSnapshot(state).authoritative;
}

export function selectTrailReadableConfiguration(
  state: TrailRuntimeState,
): TrailConfiguration | null {
  return selectTrailReadableRuntimeSnapshot(state).authoritative.configuration;
}

export function selectTrailReadableProjectById(
  state: TrailRuntimeState,
  projectId: string,
): TrailProject | undefined {
  return selectTrailReadableRuntimeSnapshot(state).authoritative.domain.projectsById.get(projectId);
}

export function selectTrailReadableTriageIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailTriageIssue | undefined {
  const issue = selectTrailReadableRuntimeSnapshot(state).authoritative.domain.issuesById.get(issueId);
  return issue?.context === "triage" ? issue : undefined;
}

export function selectTrailReadableWorkflowIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailWorkflowIssue | undefined {
  const issue = selectTrailReadableRuntimeSnapshot(state).authoritative.domain.issuesById.get(issueId);
  return issue?.context === "workflow" ? issue : undefined;
}

/** Project navigation remains deterministic without persisting a manual rank. */
export function selectTrailReadableProjectIds(
  state: TrailRuntimeState,
): readonly string[] {
  return [...selectTrailReadableRuntimeSnapshot(state).authoritative.domain.projectsById.values()]
    .sort((left, right) => {
      const titleOrder = left.title.localeCompare(right.title);
      return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
    })
    .map((project) => project.id);
}

/** Triage is a due-driven inbox: earliest review point first, then stable identity. */
export function selectTrailReadableTriageIssueIds(
  state: TrailRuntimeState,
): readonly string[] {
  return [...selectTrailReadableRuntimeSnapshot(state).authoritative.domain.issuesById.values()]
    .filter((issue): issue is TrailTriageIssue => issue.context === "triage")
    .sort((left, right) => left.due - right.due || left.id.localeCompare(right.id))
    .map((issue) => issue.id);
}

export function selectTrailReadableProjectIdsByInitiative(
  state: TrailRuntimeState,
  initiativeId: string,
): readonly string[] {
  return selectTrailReadableRuntimeSnapshot(state).indexes.projectsByInitiativeId.get(initiativeId) ?? [];
}

export function selectTrailReadableMilestoneIdsByProject(
  state: TrailRuntimeState,
  projectId: string,
): readonly string[] {
  return selectTrailReadableRuntimeSnapshot(state).indexes.milestonesByProjectId.get(projectId) ?? [];
}

export function selectTrailReadableWorkflowIssueIdsByMilestone(
  state: TrailRuntimeState,
  milestoneId: string,
): readonly string[] {
  return selectTrailReadableRuntimeSnapshot(state).indexes.issuesByMilestoneId.get(milestoneId) ?? [];
}

export function selectTrailReadableCurrentCycleId(
  state: TrailRuntimeState,
): string | undefined {
  return selectTrailReadableRuntimeSnapshot(state).indexes.currentCycleId;
}

export function selectTrailReadableWorkflowIssueIdsByCycle(
  state: TrailRuntimeState,
  cycleId: string,
): readonly string[] {
  return selectTrailReadableRuntimeSnapshot(state).indexes.issuesByCycleId.get(cycleId) ?? [];
}

export function selectTrailReadableCycleIdsByIssue(
  state: TrailRuntimeState,
  issueId: string,
): readonly string[] {
  return selectTrailReadableRuntimeSnapshot(state).indexes.cyclesByIssueId.get(issueId) ?? [];
}

export function selectTrailReadableEntityIdsByLabel(
  state: TrailRuntimeState,
  labelId: string,
): readonly string[] {
  return selectTrailReadableRuntimeSnapshot(state).indexes.entityRefsByLabelId.get(labelId) ?? [];
}

export function selectTrailReadableEntityIdsByStatusDefinition(
  state: TrailRuntimeState,
  statusDefinitionId: string,
): readonly string[] {
  return selectTrailReadableRuntimeSnapshot(state).indexes.entityRefsByStatusDefinitionId
    .get(statusDefinitionId) ?? [];
}

function statusCategoryFor(
  configuration: TrailConfiguration,
  issue: TrailWorkflowIssue,
): TrailStatusCategory | undefined {
  return resolveTrailStatusDefinition(
    configuration,
    "issue",
    issue.statusDefinitionId,
  )?.category;
}

function workflowSortKey(
  configuration: TrailConfiguration,
  issue: TrailWorkflowIssue,
): readonly [number, number, number, string] {
  const category = statusCategoryFor(configuration, issue);
  const categoryIndex = category === undefined
    ? TRAIL_STATUS_CATEGORIES.length
    : STATUS_CATEGORY_ORDER.get(category) ?? TRAIL_STATUS_CATEGORIES.length;
  const priorityIndex = issue.priority === undefined
    ? TRAIL_PRIORITIES.length
    : PRIORITY_ORDER.get(issue.priority) ?? TRAIL_PRIORITIES.length;
  const time = category === "started"
    ? issue.firstStartedAt ?? issue.createdAt
    : issue.createdAt;
  return [categoryIndex, priorityIndex, time, issue.id];
}

/**
 * Project Issue ordering is presentation-only. The Runtime index narrows the
 * membership set; Query keeps the established status/priority/activity ordering.
 */
export function selectTrailReadableWorkflowIssueIdsByProject(
  state: TrailRuntimeState,
  projectId: string,
): readonly string[] {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return [];

  return (readable.indexes.issuesByProjectId.get(projectId) ?? [])
    .map((issueId) => readable.authoritative.domain.issuesById.get(issueId))
    .filter((issue): issue is TrailWorkflowIssue => issue?.context === "workflow")
    .sort((left, right) => {
      const leftKey = workflowSortKey(configuration, left);
      const rightKey = workflowSortKey(configuration, right);
      for (let index = 0; index < leftKey.length - 1; index += 1) {
        const delta = Number(leftKey[index]) - Number(rightKey[index]);
        if (delta !== 0) return delta;
      }
      return leftKey[3].localeCompare(rightKey[3]);
    })
    .map((issue) => issue.id);
}

export function selectIsTrailEntityPending(
  state: TrailRuntimeState,
  entityId: string,
): boolean {
  return state.pending.some((plan) => plan.affectedScope.entityIds.includes(entityId));
}
