import type {
  TrailConfiguration,
  TrailStatusDefinition,
} from "../../domain/model/trail-configuration";
import type {
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  TRAIL_PROJECT_STATUS_CATEGORIES,
  type TrailPriority,
  type TrailProjectStatusCategory,
  type TrailStatusCategory,
  type TrailTimestamp,
} from "../../domain/model/trail-values";
import { resolveTrailStatusDefinition } from "../../domain/rules/trail-status-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { matchesTrailDueFilter } from "../shared/trail-collection-filter";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";
import { selectTrailStatusOptionGroups } from "../shared/trail-status-query";
import {
  selectTrailInitiativeTargets,
  type TrailProjectProgressReadModel,
} from "./trail-project-collection-query";

export interface TrailProjectInspectorStatusOptionGroupReadModel {
  readonly category: TrailProjectStatusCategory;
  readonly definitions: readonly TrailStatusDefinition[];
}

export interface TrailProjectInspectorAttentionReadModel {
  readonly later: number;
  readonly overdue: number;
  readonly thisWeek: number;
}

export interface TrailProjectInspectorMilestoneReadModel {
  readonly due?: TrailTimestamp;
  readonly id: string;
  readonly progress: TrailProjectProgressReadModel;
  readonly title: string;
}

function isTrailProjectStatusCategory(
  category: TrailStatusCategory,
): category is TrailProjectStatusCategory {
  return TRAIL_PROJECT_STATUS_CATEGORIES.some((candidate) => candidate === category);
}

export interface TrailProjectInspectorReadModel {
  readonly attention: TrailProjectInspectorAttentionReadModel;
  readonly configuration: TrailConfiguration;
  readonly due?: TrailTimestamp;
  readonly expectedProject: TrailProject;
  readonly initiativeId?: string;
  readonly initiativeTargets: readonly { readonly id: string; readonly title: string }[];
  readonly labelIds: readonly string[];
  readonly milestones: readonly TrailProjectInspectorMilestoneReadModel[];
  readonly priority?: TrailPriority;
  readonly progress: TrailProjectProgressReadModel;
  readonly status: {
    readonly category: TrailProjectStatusCategory;
    readonly id: string;
    readonly label: string;
  };
  readonly statusOptionGroups: readonly TrailProjectInspectorStatusOptionGroupReadModel[];
  readonly title: string;
}

function progressFromIssues(
  configuration: TrailConfiguration,
  issues: readonly TrailWorkflowIssue[],
): TrailProjectProgressReadModel | null {
  let completed = 0;
  let effective = 0;

  for (const issue of issues) {
    const status = resolveTrailStatusDefinition(
      configuration,
      "issue",
      issue.statusDefinitionId,
    );
    if (status === undefined) return null;
    if (status.category === "canceled") continue;
    effective += 1;
    if (status.category === "completed") completed += 1;
  }

  return effective === 0
    ? { unavailable: true }
    : { max: effective, value: completed };
}

function issueProjectionForProject(
  readable: ReturnType<typeof selectTrailReadableRuntimeSnapshot>,
  projectId: string,
): readonly TrailWorkflowIssue[] | null {
  const issues: TrailWorkflowIssue[] = [];
  for (const issueId of readable.indexes.issuesByProjectId.get(projectId) ?? []) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow" || issue.projectId !== projectId) return null;
    issues.push(issue);
  }
  return issues;
}

function attentionFromIssues(
  configuration: TrailConfiguration,
  issues: readonly TrailWorkflowIssue[],
  now: TrailTimestamp,
): TrailProjectInspectorAttentionReadModel | null {
  let overdue = 0;
  let thisWeek = 0;
  let later = 0;

  for (const issue of issues) {
    const status = resolveTrailStatusDefinition(
      configuration,
      "issue",
      issue.statusDefinitionId,
    );
    if (status === undefined) return null;
    if (status.category === "completed" || status.category === "canceled" || issue.due === undefined) {
      continue;
    }

    if (matchesTrailDueFilter(
      issue.due,
      { kind: "overdue" },
      now,
      configuration.temporal.timezone,
    )) {
      overdue += 1;
    } else if (matchesTrailDueFilter(
      issue.due,
      { kind: "this-week" },
      now,
      configuration.temporal.timezone,
    )) {
      thisWeek += 1;
    } else {
      later += 1;
    }
  }

  return { later, overdue, thisWeek };
}

function milestoneProjection(
  readable: ReturnType<typeof selectTrailReadableRuntimeSnapshot>,
  configuration: TrailConfiguration,
  projectId: string,
): readonly TrailProjectInspectorMilestoneReadModel[] | null {
  const milestones: TrailProjectInspectorMilestoneReadModel[] = [];

  for (const milestone of readable.authoritative.domain.milestonesById.values()) {
    if (milestone.projectId !== projectId) continue;
    const issueIds = readable.indexes.issuesByMilestoneId.get(milestone.id) ?? [];
    const issues: TrailWorkflowIssue[] = [];
    for (const issueId of issueIds) {
      const issue = readable.authoritative.domain.issuesById.get(issueId);
      if (
        issue?.context !== "workflow"
        || issue.projectId !== projectId
        || issue.milestoneId !== milestone.id
      ) return null;
      issues.push(issue);
    }
    const progress = progressFromIssues(configuration, issues);
    if (progress === null) return null;
    milestones.push({
      due: milestone.due,
      id: milestone.id,
      progress,
      title: milestone.title,
    });
  }

  return milestones;
}

export function selectTrailProjectInspectorReadModel(
  state: TrailRuntimeState,
  projectId: string,
  now: TrailTimestamp,
): TrailProjectInspectorReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const project = readable.authoritative.domain.projectsById.get(projectId);
  if (project === undefined) return null;
  const status = resolveTrailStatusDefinition(
    configuration,
    "project",
    project.statusDefinitionId,
  );
  if (status === undefined) return null;

  if (!isTrailProjectStatusCategory(status.category)) return null;

  const statusOptionGroups: TrailProjectInspectorStatusOptionGroupReadModel[] = [];
  for (const group of selectTrailStatusOptionGroups(configuration, "project")) {
    if (!isTrailProjectStatusCategory(group.category)) return null;
    statusOptionGroups.push({
      category: group.category,
      definitions: group.definitions,
    });
  }

  const issues = issueProjectionForProject(readable, project.id);
  if (issues === null) return null;
  const progress = progressFromIssues(configuration, issues);
  const attention = attentionFromIssues(configuration, issues, now);
  const milestones = milestoneProjection(readable, configuration, project.id);
  if (progress === null || attention === null || milestones === null) return null;

  return {
    attention,
    configuration,
    due: project.due,
    expectedProject: project,
    initiativeId: project.initiativeId,
    initiativeTargets: selectTrailInitiativeTargets(readable),
    labelIds: project.labelIds,
    milestones,
    priority: project.priority,
    progress,
    status: {
      category: status.category,
      id: status.id,
      label: status.name,
    },
    statusOptionGroups,
    title: project.title,
  };
}
