import type {
  TrailCycle,
  TrailInitiative,
  TrailIssue,
  TrailMilestone,
  TrailProject,
} from "../model/trail-entities";
import {
  isTrailEstimate,
  isTrailId,
  isTrailPriority,
  isTrailTimestamp,
  isTrailTitle,
} from "./trail-value-validation";

export interface TrailDomainValidationIssue {
  readonly code: string;
  readonly field?: string;
  readonly message: string;
}

function issue(code: string, message: string, field?: string): TrailDomainValidationIssue {
  return { code, field, message };
}

function validateCommonText(
  value: { readonly id: string; readonly title: string; readonly description?: string },
): TrailDomainValidationIssue[] {
  const issues: TrailDomainValidationIssue[] = [];
  if (!isTrailId(value.id)) issues.push(issue("id.invalid", "id must be non-empty text", "id"));
  if (!isTrailTitle(value.title)) issues.push(issue("title.invalid", "title must be non-empty single-line text", "title"));
  if (value.description !== undefined && typeof value.description !== "string") {
    issues.push(issue("description.invalid", "description must be text when present", "description"));
  }
  return issues;
}

function validateLabelIds(labelIds: readonly string[]): TrailDomainValidationIssue[] {
  const issues: TrailDomainValidationIssue[] = [];
  const seen = new Set<string>();
  for (const id of labelIds) {
    if (!isTrailId(id)) {
      issues.push(issue("label-id.invalid", "labelIds must contain non-empty IDs", "labelIds"));
    } else if (seen.has(id)) {
      issues.push(issue("label-id.duplicate", `duplicate label ID: ${id}`, "labelIds"));
    }
    seen.add(id);
  }
  return issues;
}

export function validateTrailInitiative(initiative: TrailInitiative): readonly TrailDomainValidationIssue[] {
  const issues = [
    ...validateCommonText(initiative),
    ...validateLabelIds(initiative.labelIds),
  ];
  if (initiative.priority !== undefined && !isTrailPriority(initiative.priority)) {
    issues.push(issue("priority.invalid", "priority is invalid", "priority"));
  }
  if (initiative.due !== undefined && !isTrailTimestamp(initiative.due)) {
    issues.push(issue("due.invalid", "due must be an epoch-millisecond timestamp", "due"));
  }
  return issues;
}

export function validateTrailProject(project: TrailProject): readonly TrailDomainValidationIssue[] {
  const issues = [
    ...validateCommonText(project),
    ...validateLabelIds(project.labelIds),
  ];
  if (!isTrailId(project.statusDefinitionId)) {
    issues.push(issue("status.invalid", "statusDefinitionId must be non-empty", "statusDefinitionId"));
  }
  if (project.initiativeId !== undefined && !isTrailId(project.initiativeId)) {
    issues.push(issue("initiative.invalid", "initiativeId must be non-empty when present", "initiativeId"));
  }
  if (project.priority !== undefined && !isTrailPriority(project.priority)) {
    issues.push(issue("priority.invalid", "priority is invalid", "priority"));
  }
  if (project.due !== undefined && !isTrailTimestamp(project.due)) {
    issues.push(issue("due.invalid", "due must be an epoch-millisecond timestamp", "due"));
  }
  return issues;
}

export function validateTrailMilestone(milestone: TrailMilestone): readonly TrailDomainValidationIssue[] {
  const issues = validateCommonText(milestone);
  if (!isTrailId(milestone.projectId)) {
    issues.push(issue("project.invalid", "projectId must be non-empty", "projectId"));
  }
  if (milestone.due !== undefined && !isTrailTimestamp(milestone.due)) {
    issues.push(issue("due.invalid", "due must be an epoch-millisecond timestamp", "due"));
  }
  return issues;
}

export function validateTrailIssue(issueValue: TrailIssue): readonly TrailDomainValidationIssue[] {
  const issues = [
    ...validateCommonText(issueValue),
    ...validateLabelIds(issueValue.labelIds),
  ];
  if (issueValue.projectId !== undefined && !isTrailId(issueValue.projectId)) {
    issues.push(issue("project.invalid", "projectId must be non-empty when present", "projectId"));
  }
  if (issueValue.milestoneId !== undefined && !isTrailId(issueValue.milestoneId)) {
    issues.push(issue("milestone.invalid", "milestoneId must be non-empty when present", "milestoneId"));
  }
  if (issueValue.milestoneId !== undefined && issueValue.projectId === undefined) {
    issues.push(issue("milestone.requires-project", "milestoneId requires projectId", "milestoneId"));
  }
  if (issueValue.priority !== undefined && !isTrailPriority(issueValue.priority)) {
    issues.push(issue("priority.invalid", "priority is invalid", "priority"));
  }
  if (issueValue.estimate !== undefined && !isTrailEstimate(issueValue.estimate)) {
    issues.push(issue(
      "estimate.invalid",
      "estimate must be small, medium, large, or xlarge",
      "estimate",
    ));
  }

  if (issueValue.context === "triage") {
    if (issueValue.projectId !== undefined) {
      issues.push(issue(
        "triage.project.forbidden",
        "Triage Issue must not belong to a Project",
        "projectId",
      ));
    }
    if (issueValue.milestoneId !== undefined) {
      issues.push(issue(
        "triage.milestone.forbidden",
        "Triage Issue must not belong to a Milestone",
        "milestoneId",
      ));
    }
    if (!isTrailTimestamp(issueValue.due)) {
      issues.push(issue("triage.due.invalid", "Triage Issue due is required", "due"));
    }
  } else {
    if (issueValue.projectId === undefined) {
      issues.push(issue(
        "workflow.project.required",
        "Workflow Issue projectId is required",
        "projectId",
      ));
    }
    if (!isTrailId(issueValue.statusDefinitionId)) {
      issues.push(issue("workflow.status.invalid", "Workflow Issue statusDefinitionId is required", "statusDefinitionId"));
    }
    if (!isTrailTimestamp(issueValue.createdAt)) {
      issues.push(issue("workflow.created-at.invalid", "Workflow Issue createdAt is required", "createdAt"));
    }
    for (const [field, value] of [
      ["due", issueValue.due],
      ["firstStartedAt", issueValue.firstStartedAt],
      ["terminalAt", issueValue.terminalAt],
    ] as const) {
      if (value !== undefined && !isTrailTimestamp(value)) {
        issues.push(issue(`workflow.${field}.invalid`, `${field} must be an epoch-millisecond timestamp`, field));
      }
    }
  }

  return issues;
}

export function validateTrailCycle(cycle: TrailCycle): readonly TrailDomainValidationIssue[] {
  const issues: TrailDomainValidationIssue[] = [];
  if (!isTrailId(cycle.id)) issues.push(issue("id.invalid", "id must be non-empty text", "id"));
  if (!isTrailTimestamp(cycle.startedAt)) issues.push(issue("started-at.invalid", "startedAt is invalid", "startedAt"));
  if (!isTrailTimestamp(cycle.plannedEnd)) issues.push(issue("planned-end.invalid", "plannedEnd is invalid", "plannedEnd"));
  if (cycle.endedAt !== undefined && !isTrailTimestamp(cycle.endedAt)) {
    issues.push(issue("ended-at.invalid", "endedAt is invalid", "endedAt"));
  }
  const seen = new Set<string>();
  for (const id of cycle.issueIds) {
    if (!isTrailId(id)) issues.push(issue("issue-id.invalid", "issueIds must contain non-empty IDs", "issueIds"));
    if (seen.has(id)) issues.push(issue("issue-id.duplicate", `duplicate Issue ID: ${id}`, "issueIds"));
    seen.add(id);
  }
  return issues;
}
