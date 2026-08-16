import type { TrailConfiguration } from "../model/trail-configuration";
import type {
  TrailCycle,
  TrailInitiative,
  TrailIssue,
  TrailMilestone,
  TrailProject,
} from "../model/trail-entities";
import type { TrailLabelEntityType } from "../model/trail-values";
import type { TrailWorkspaceState } from "../model/trail-workspace-state";
import {
  validateTrailConfiguration,
  validateTrailWorkspaceState,
} from "./trail-configuration-validation";

export interface TrailDomainGraph {
  readonly cyclesById: ReadonlyMap<string, TrailCycle>;
  readonly initiativesById: ReadonlyMap<string, TrailInitiative>;
  readonly issuesById: ReadonlyMap<string, TrailIssue>;
  readonly milestonesById: ReadonlyMap<string, TrailMilestone>;
  readonly projectsById: ReadonlyMap<string, TrailProject>;
}

export interface TrailWorkspaceValidationIssue {
  readonly code: string;
  readonly entityId?: string;
  readonly entityKind?: "initiative" | "project" | "milestone" | "issue" | "cycle";
  readonly field?: string;
  readonly message: string;
  readonly stage: "domain" | "reference" | "workspace";
}

function issue(
  code: string,
  message: string,
  options: Omit<TrailWorkspaceValidationIssue, "code" | "message">,
): TrailWorkspaceValidationIssue {
  return { code, message, ...options };
}

function validateGlobalIdentity(
  domain: TrailDomainGraph,
  issues: TrailWorkspaceValidationIssue[],
): void {
  const seen = new Map<string, string>();
  for (const [kind, values] of [
    ["initiative", domain.initiativesById.values()],
    ["project", domain.projectsById.values()],
    ["milestone", domain.milestonesById.values()],
    ["issue", domain.issuesById.values()],
    ["cycle", domain.cyclesById.values()],
  ] as const) {
    for (const value of values) {
      const previous = seen.get(value.id);
      if (previous !== undefined) {
        issues.push(issue(
          "workspace.entity-id.duplicate",
          `Trail entity ID ${value.id} is used by both ${previous} and ${kind}`,
          { entityId: value.id, entityKind: kind, stage: "workspace" },
        ));
      } else {
        seen.set(value.id, kind);
      }
    }
  }
}

function validateLabels(
  configuration: TrailConfiguration,
  entityType: TrailLabelEntityType,
  entityKind: "initiative" | "project" | "issue",
  entityId: string,
  labelIds: readonly string[],
  issues: TrailWorkspaceValidationIssue[],
): void {
  const labelsById = new Map(configuration.labels.map((label) => [label.id, label] as const));
  const groupsById = new Map(configuration.labelGroups.map((group) => [group.id, group] as const));
  const selectedByGroup = new Map<string, string[]>();

  for (const labelId of labelIds) {
    const label = labelsById.get(labelId);
    if (label === undefined) {
      issues.push(issue(
        "reference.label.missing",
        `Entity ${entityId} references unknown Label ${labelId}`,
        { entityId, entityKind, field: "labelIds", stage: "reference" },
      ));
      continue;
    }
    const group = groupsById.get(label.groupId);
    if (group === undefined) {
      issues.push(issue(
        "reference.label-group.missing",
        `Label ${label.id} references unknown LabelGroup ${label.groupId}`,
        { entityId, entityKind, field: "labelIds", stage: "reference" },
      ));
      continue;
    }
    if (!group.registeredEntityTypes.includes(entityType)) {
      issues.push(issue(
        "reference.label.scope",
        `Label ${label.id} is not registered for ${entityType}`,
        { entityId, entityKind, field: "labelIds", stage: "reference" },
      ));
    }
    const selected = selectedByGroup.get(group.id) ?? [];
    selected.push(label.id);
    selectedByGroup.set(group.id, selected);
  }

  for (const [groupId, selected] of selectedByGroup) {
    const group = groupsById.get(groupId);
    if (group?.selectionMode === "single" && selected.length > 1) {
      issues.push(issue(
        "domain.label-group.single-selection",
        `Entity ${entityId} selects multiple Labels from single-select group ${groupId}`,
        { entityId, entityKind, field: "labelIds", stage: "domain" },
      ));
    }
  }
}

function resolveValidStatusReference(
  configuration: TrailConfiguration,
  entityType: "issue" | "project",
  entityKind: "issue" | "project",
  entityId: string,
  statusDefinitionId: string,
  issues: TrailWorkspaceValidationIssue[],
) {
  const definition = configuration.statusDefinitions.find(({ id }) => id === statusDefinitionId);
  if (definition === undefined || definition.entityType !== entityType) {
    issues.push(issue(
      "reference.status-definition.invalid",
      `${entityKind} ${entityId} references an invalid ${entityType} StatusDefinition ${statusDefinitionId}`,
      { entityId, entityKind, field: "statusDefinitionId", stage: "reference" },
    ));
    return undefined;
  }
  return definition;
}

function validateWorkflowLifecycle(
  issueValue: Extract<TrailIssue, { readonly context: "workflow" }>,
  category: string,
  issues: TrailWorkspaceValidationIssue[],
): void {
  if (category === "completed" && issueValue.estimate === undefined) {
    issues.push(issue(
      "domain.issue.completed-estimate-required",
      `Completed Issue ${issueValue.id} requires Estimate`,
      { entityId: issueValue.id, entityKind: "issue", field: "estimate", stage: "domain" },
    ));
  }
  if (category === "started" && issueValue.firstStartedAt === undefined) {
    issues.push(issue(
      "domain.issue.started-at-required",
      `Started Issue ${issueValue.id} requires firstStartedAt`,
      { entityId: issueValue.id, entityKind: "issue", field: "firstStartedAt", stage: "domain" },
    ));
  }
  const terminal = category === "completed" || category === "canceled";
  if (terminal && issueValue.terminalAt === undefined) {
    issues.push(issue(
      "domain.issue.terminal-at-required",
      `Terminal Issue ${issueValue.id} requires terminalAt`,
      { entityId: issueValue.id, entityKind: "issue", field: "terminalAt", stage: "domain" },
    ));
  } else if (!terminal && issueValue.terminalAt !== undefined) {
    issues.push(issue(
      "domain.issue.terminal-at-nonterminal",
      `Non-terminal Issue ${issueValue.id} must not retain terminalAt`,
      { entityId: issueValue.id, entityKind: "issue", field: "terminalAt", stage: "domain" },
    ));
  }
}

/** Validates cross-record and workspace invariants after individual carriers are trusted. */
export function validateTrailWorkspaceGraph(input: {
  readonly configuration: TrailConfiguration;
  readonly domain: TrailDomainGraph;
  readonly workspaceState: TrailWorkspaceState;
}): readonly TrailWorkspaceValidationIssue[] {
  const issues: TrailWorkspaceValidationIssue[] = [];
  for (const validationIssue of validateTrailConfiguration(input.configuration)) {
    issues.push(issue(
      `configuration.${validationIssue.code}`,
      validationIssue.message,
      { field: validationIssue.field, stage: "domain" },
    ));
  }
  for (const validationIssue of validateTrailWorkspaceState(input.workspaceState)) {
    issues.push(issue(
      `workspace-state.${validationIssue.code}`,
      validationIssue.message,
      { field: validationIssue.field, stage: "workspace" },
    ));
  }

  validateGlobalIdentity(input.domain, issues);

  for (const initiative of input.domain.initiativesById.values()) {
    validateLabels(
      input.configuration,
      "initiative",
      "initiative",
      initiative.id,
      initiative.labelIds,
      issues,
    );
  }

  for (const project of input.domain.projectsById.values()) {
    resolveValidStatusReference(
      input.configuration,
      "project",
      "project",
      project.id,
      project.statusDefinitionId,
      issues,
    );
    if (
      project.initiativeId !== undefined
      && !input.domain.initiativesById.has(project.initiativeId)
    ) {
      issues.push(issue(
        "reference.project.initiative-missing",
        `Project ${project.id} references missing Initiative ${project.initiativeId}`,
        { entityId: project.id, entityKind: "project", field: "initiativeId", stage: "reference" },
      ));
    }
    validateLabels(
      input.configuration,
      "project",
      "project",
      project.id,
      project.labelIds,
      issues,
    );
  }

  for (const milestone of input.domain.milestonesById.values()) {
    if (!input.domain.projectsById.has(milestone.projectId)) {
      issues.push(issue(
        "reference.milestone.project-missing",
        `Milestone ${milestone.id} references missing Project ${milestone.projectId}`,
        { entityId: milestone.id, entityKind: "milestone", field: "projectId", stage: "reference" },
      ));
    }
  }

  for (const issueValue of input.domain.issuesById.values()) {
    if (
      issueValue.projectId !== undefined
      && !input.domain.projectsById.has(issueValue.projectId)
    ) {
      issues.push(issue(
        "reference.issue.project-missing",
        `Issue ${issueValue.id} references missing Project ${issueValue.projectId}`,
        { entityId: issueValue.id, entityKind: "issue", field: "projectId", stage: "reference" },
      ));
    }
    if (issueValue.milestoneId !== undefined) {
      const milestone = input.domain.milestonesById.get(issueValue.milestoneId);
      if (milestone === undefined) {
        issues.push(issue(
          "reference.issue.milestone-missing",
          `Issue ${issueValue.id} references missing Milestone ${issueValue.milestoneId}`,
          { entityId: issueValue.id, entityKind: "issue", field: "milestoneId", stage: "reference" },
        ));
      } else if (issueValue.projectId === undefined || milestone.projectId !== issueValue.projectId) {
        issues.push(issue(
          "reference.issue.milestone-project-mismatch",
          `Issue ${issueValue.id} Milestone does not belong to its Project`,
          { entityId: issueValue.id, entityKind: "issue", field: "milestoneId", stage: "reference" },
        ));
      }
    }
    if (issueValue.context === "workflow") {
      const status = resolveValidStatusReference(
        input.configuration,
        "issue",
        "issue",
        issueValue.id,
        issueValue.statusDefinitionId,
        issues,
      );
      if (status !== undefined) {
        validateWorkflowLifecycle(issueValue, status.category, issues);
      }
    }
    validateLabels(
      input.configuration,
      "issue",
      "issue",
      issueValue.id,
      issueValue.labelIds,
      issues,
    );
  }

  for (const project of input.domain.projectsById.values()) {
    const projectStatus = input.configuration.statusDefinitions.find(
      ({ id }) => id === project.statusDefinitionId,
    );
    if (projectStatus?.entityType !== "project" || projectStatus.category !== "completed") continue;

    const activeChild = [...input.domain.issuesById.values()].find((candidate) => {
      if (candidate.context !== "workflow" || candidate.projectId !== project.id) return false;
      const childStatus = input.configuration.statusDefinitions.find(({ id }) => (
        id === candidate.statusDefinitionId
      ));
      return childStatus?.entityType === "issue"
        && childStatus.category !== "completed"
        && childStatus.category !== "canceled";
    });
    if (activeChild !== undefined) {
      issues.push(issue(
        "domain.project.completed-active-child",
        `Completed Project ${project.id} contains non-terminal Issue ${activeChild.id}`,
        { entityId: project.id, entityKind: "project", field: "statusDefinitionId", stage: "domain" },
      ));
    }
  }

  const openCycles = [...input.domain.cyclesById.values()].filter(({ endedAt }) => endedAt === undefined);
  if (openCycles.length > 1) {
    issues.push(issue(
      "workspace.cycle.multiple-open",
      "Workspace may contain at most one open Cycle",
      { stage: "workspace" },
    ));
  }
  for (const cycle of input.domain.cyclesById.values()) {
    for (const issueId of cycle.issueIds) {
      const issueValue = input.domain.issuesById.get(issueId);
      if (issueValue === undefined) {
        issues.push(issue(
          "reference.cycle.issue-missing",
          `Cycle ${cycle.id} references missing Issue ${issueId}`,
          { entityId: cycle.id, entityKind: "cycle", field: "issueIds", stage: "reference" },
        ));
      } else if (issueValue.context !== "workflow") {
        issues.push(issue(
          "domain.cycle.triage-member",
          `Cycle ${cycle.id} cannot contain Triage Issue ${issueId}`,
          { entityId: cycle.id, entityKind: "cycle", field: "issueIds", stage: "domain" },
        ));
      }
    }
  }

  return issues;
}
