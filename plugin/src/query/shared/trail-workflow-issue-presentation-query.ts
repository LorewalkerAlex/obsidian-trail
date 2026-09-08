import type { TrailLabel } from "../../domain/model/trail-configuration";
import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type {
  TrailEstimate,
  TrailPriority,
  TrailStatusCategory,
  TrailTimestamp,
} from "../../domain/model/trail-values";
import { resolveTrailStatusDefinition } from "../../domain/rules/trail-status-rules";
import type { TrailEffectiveRuntimeSnapshot } from "../../runtime/projection/trail-runtime-projection";

export interface TrailWorkflowIssueNamedRelationReadModel {
  readonly id: string;
  readonly title: string;
}

export interface TrailWorkflowIssuePresentationReadModel {
  readonly description?: string;
  readonly due?: TrailTimestamp;
  readonly estimate?: TrailEstimate;
  readonly id: string;
  readonly inCurrentCycle: boolean;
  readonly labels: readonly TrailLabel[];
  readonly milestone?: TrailWorkflowIssueNamedRelationReadModel;
  readonly priority?: TrailPriority;
  readonly project: TrailWorkflowIssueNamedRelationReadModel;
  readonly status: {
    readonly category: TrailStatusCategory;
    readonly id: string;
    readonly label: string;
  };
  readonly title: string;
}

export type TrailWorkflowIssuePresentationProjector = (
  issue: TrailWorkflowIssue,
) => TrailWorkflowIssuePresentationReadModel | null;

export function createTrailWorkflowIssuePresentationProjector(
  readable: TrailEffectiveRuntimeSnapshot,
): TrailWorkflowIssuePresentationProjector | null {
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const labelsById = new Map(configuration.labels.map((label) => [label.id, label] as const));
  const currentCycleId = readable.indexes.currentCycleId;

  return (issue) => {
    const status = resolveTrailStatusDefinition(
      configuration,
      "issue",
      issue.statusDefinitionId,
    );
    const project = readable.authoritative.domain.projectsById.get(issue.projectId);
    if (status === undefined || project === undefined) return null;

    const milestone = issue.milestoneId === undefined
      ? undefined
      : readable.authoritative.domain.milestonesById.get(issue.milestoneId);
    if (issue.milestoneId !== undefined && milestone === undefined) return null;

    const labels: TrailLabel[] = [];
    for (const labelId of issue.labelIds) {
      const label = labelsById.get(labelId);
      if (label === undefined) return null;
      labels.push(label);
    }
    labels.sort((left, right) => {
      const nameOrder = left.name.localeCompare(right.name);
      return nameOrder !== 0 ? nameOrder : left.id.localeCompare(right.id);
    });

    return {
      description: issue.description,
      due: issue.due,
      estimate: issue.estimate,
      id: issue.id,
      inCurrentCycle: currentCycleId !== undefined
        && (readable.indexes.cyclesByIssueId.get(issue.id) ?? []).includes(currentCycleId),
      labels,
      milestone: milestone === undefined
        ? undefined
        : { id: milestone.id, title: milestone.title },
      priority: issue.priority,
      project: { id: project.id, title: project.title },
      status: {
        category: status.category,
        id: status.id,
        label: status.name,
      },
      title: issue.title,
    };
  };
}
