import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailCycle, TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type { TrailEstimate, TrailPriority, TrailTimestamp } from "../../domain/model/trail-values";
import { isTrailRuntimeWritable } from "../../runtime/control/trail-runtime-control";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  selectTrailWorkflowIssueEffectiveCapabilitiesFromReadableSnapshot,
  type TrailWorkflowIssueEffectiveCapabilities,
} from "../shared/trail-effective-capability-query";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";
import { selectTrailWorkflowIssueMoveProjectIdsFromReadableSnapshot } from "../shared/trail-project-target-query";
import {
  selectTrailStatusDefinition,
  selectTrailStatusOptionGroups,
  type TrailStatusOptionGroup,
} from "../shared/trail-status-query";

export interface TrailIssueInspectorNamedTarget {
  readonly id: string;
  readonly title: string;
}

export interface TrailIssueInspectorCurrentCycleReadModel {
  readonly expectedCycle: TrailCycle;
  readonly isMember: boolean;
}

export interface TrailIssueInspectorReadModel {
  readonly capabilities: TrailWorkflowIssueEffectiveCapabilities;
  readonly canChangeCurrentCycleMembership: boolean;
  readonly configuration: TrailConfiguration;
  readonly currentCycle?: TrailIssueInspectorCurrentCycleReadModel;
  readonly due?: TrailTimestamp;
  readonly estimate?: TrailEstimate;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly labelIds: readonly string[];
  readonly milestoneId?: string;
  readonly milestoneTargets: readonly TrailIssueInspectorNamedTarget[];
  readonly priority?: TrailPriority;
  readonly project: TrailIssueInspectorNamedTarget;
  readonly projectTargets: readonly TrailIssueInspectorNamedTarget[];
  readonly status: {
    readonly category: TrailStatusOptionGroup["category"];
    readonly id: string;
    readonly label: string;
  };
  readonly statusOptionGroups: readonly TrailStatusOptionGroup[];
  readonly title: string;
}

function namedMilestoneTargets(
  state: ReturnType<typeof selectTrailReadableRuntimeSnapshot>,
  projectId: string,
): readonly TrailIssueInspectorNamedTarget[] {
  return (state.indexes.milestonesByProjectId.get(projectId) ?? [])
    .map((milestoneId) => state.authoritative.domain.milestonesById.get(milestoneId))
    .filter((milestone): milestone is NonNullable<typeof milestone> => milestone !== undefined)
    .sort((left, right) => {
      const titleOrder = left.title.localeCompare(right.title);
      return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
    })
    .map(({ id, title }) => ({ id, title }));
}

/**
 * Issue Inspector consumes one readable snapshot so property presentation,
 * legal targets, and Current Cycle context all describe the same effective state.
 */
export function selectTrailIssueInspectorReadModel(
  state: TrailRuntimeState,
  issueId: string,
): TrailIssueInspectorReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const issue = readable.authoritative.domain.issuesById.get(issueId);
  if (issue?.context !== "workflow") return null;
  const project = readable.authoritative.domain.projectsById.get(issue.projectId);
  if (project === undefined) return null;
  const status = selectTrailStatusDefinition(configuration, "issue", issue.statusDefinitionId);
  if (status === undefined) return null;

  const effective = selectTrailWorkflowIssueEffectiveCapabilitiesFromReadableSnapshot(
    readable,
    state.control,
    issue.id,
  );
  if (effective === null) return null;

  const visibleStatusIds = new Set([
    issue.statusDefinitionId,
    ...effective.legalTargets.statusDefinitionIds,
  ]);
  const statusOptionGroups = selectTrailStatusOptionGroups(configuration, "issue")
    .map((group) => ({
      ...group,
      definitions: group.definitions.filter(({ id }) => visibleStatusIds.has(id)),
    }))
    .filter(({ definitions }) => definitions.length > 0);

  const projectTargets = selectTrailWorkflowIssueMoveProjectIdsFromReadableSnapshot(
    readable,
    issue.id,
  ).map((projectId) => readable.authoritative.domain.projectsById.get(projectId))
    .filter((target): target is NonNullable<typeof target> => target !== undefined)
    .map(({ id, title }) => ({ id, title }));

  const currentCycleId = readable.indexes.currentCycleId;
  const currentCycle = currentCycleId === undefined
    ? undefined
    : readable.authoritative.domain.cyclesById.get(currentCycleId);

  return {
    capabilities: effective.capabilities,
    canChangeCurrentCycleMembership: currentCycle !== undefined
      && isTrailRuntimeWritable(state.control),
    configuration,
    currentCycle: currentCycle === undefined
      ? undefined
      : {
          expectedCycle: currentCycle,
          isMember: currentCycle.issueIds.includes(issue.id),
        },
    due: issue.due,
    estimate: issue.estimate,
    expectedIssue: issue,
    labelIds: issue.labelIds,
    milestoneId: issue.milestoneId,
    milestoneTargets: namedMilestoneTargets(readable, issue.projectId),
    priority: issue.priority,
    project: { id: project.id, title: project.title },
    projectTargets,
    status: {
      category: status.category,
      id: status.id,
      label: status.name,
    },
    statusOptionGroups,
    title: issue.title,
  };
}
