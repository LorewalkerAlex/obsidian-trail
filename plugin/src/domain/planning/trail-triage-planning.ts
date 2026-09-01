import type { TrailProject, TrailTriageIssue, TrailWorkflowIssue } from "../model/trail-entities";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import { findTrailLabelSelectionViolations } from "../rules/trail-label-rules";
import { validateTrailIssue } from "../validation/trail-record-validation";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import {
  planCreateTrailProjectFromDraft,
  planCreateTrailWorkflowIssueFromDraft,
} from "./trail-creation-planning";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailTriageIssueCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due: number;
  readonly issueId: string;
  readonly labelIds: readonly string[];
  readonly priority?: TrailTriageIssue["priority"];
  readonly title: string;
}

export interface EditTrailTriageIssueCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due: number;
  readonly expectedIssue: TrailTriageIssue;
  readonly labelIds: readonly string[];
  readonly priority?: TrailTriageIssue["priority"];
  readonly title: string;
}

export interface DeferTrailTriageIssueCommand {
  readonly commandId: string;
  readonly due: number;
  readonly expectedIssue: TrailTriageIssue;
}

export interface DeleteTrailTriageIssueCommand {
  readonly commandId: string;
  readonly expectedIssue: TrailTriageIssue;
}

export interface AcceptTrailTriageIssueCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due?: number;
  readonly effectiveAt: number;
  readonly estimate?: TrailWorkflowIssue["estimate"];
  readonly expectedIssue: TrailTriageIssue;
  readonly labelIds: readonly string[];
  readonly milestoneId?: string;
  readonly priority?: TrailWorkflowIssue["priority"];
  readonly projectId: string;
  readonly targetIssueId: string;
  readonly title: string;
}

export interface ConvertTrailTriageIssueToProjectCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due?: number;
  readonly expectedIssue: TrailTriageIssue;
  readonly initiativeId?: string;
  readonly labelIds: readonly string[];
  readonly priority?: TrailProject["priority"];
  readonly targetProjectId: string;
  readonly title: string;
}

export interface TrailTriageIssuePlan {
  readonly issue: TrailTriageIssue;
  readonly plan: TrailMutationPlan;
}

export interface TrailTriageDeletePlan {
  readonly issueId: string;
  readonly plan: TrailMutationPlan;
}

export interface TrailTriageAcceptPlan {
  readonly plan: TrailMutationPlan;
  readonly sourceIssueId: string;
  readonly targetIssue: TrailWorkflowIssue;
}

export interface TrailTriageConvertProjectPlan {
  readonly plan: TrailMutationPlan;
  readonly sourceIssueId: string;
  readonly targetProject: TrailProject;
}

function currentTriageIssue(
  state: TrailPlanningState,
  expected: TrailTriageIssue,
): TrailTriageIssue | undefined {
  const current = state.domain.issuesById.get(expected.id);
  return current?.context === "triage" ? current : undefined;
}

function sameTriageIssue(left: TrailTriageIssue, right: TrailTriageIssue): boolean {
  return sameTrailDomainEntity(
    { kind: "issue", value: left },
    { kind: "issue", value: right },
  );
}

function triageIssueValidationReason(
  state: TrailPlanningState,
  issue: TrailTriageIssue,
): { readonly code: string; readonly message: string } | undefined {
  const recordIssues = validateTrailIssue(issue);
  if (recordIssues.length > 0) {
    return {
      code: "triage-issue-invalid",
      message: recordIssues.map(({ message }) => message).join("; "),
    };
  }

  const violation = findTrailLabelSelectionViolations(
    state.configuration,
    "issue",
    issue.labelIds,
  )[0];
  if (violation === undefined) return undefined;

  switch (violation.kind) {
    case "label-missing":
      return {
        code: "label-missing",
        message: `Triage Issue references unknown Label ${violation.labelId}`,
      };
    case "label-group-missing":
      return {
        code: "label-group-missing",
        message: `Label ${violation.labelId} references unknown LabelGroup ${violation.groupId}`,
      };
    case "label-scope":
      return {
        code: "label-scope",
        message: `Label ${violation.labelId} is not registered for Triage Issues`,
      };
    case "single-selection":
      return {
        code: "label-group-single-selection",
        message: `Triage Issue selects multiple Labels from single-select group ${violation.groupId}`,
      };
  }
}

export function planCreateTrailTriageIssue(
  state: TrailPlanningState,
  command: CreateTrailTriageIssueCommand,
): TrailPlanResult<TrailTriageIssuePlan> {
  if (trailPlanningEntityExists(state.domain, command.issueId)) {
    return rejectTrailPlan("entity-id-conflict", `Trail entity ID already exists: ${command.issueId}`);
  }
  const issue: TrailTriageIssue = {
    context: "triage",
    description: command.description,
    due: command.due,
    id: command.issueId,
    labelIds: [...command.labelIds],
    priority: command.priority,
    title: command.title,
  };
  const invalid = triageIssueValidationReason(state, issue);
  if (invalid !== undefined) return rejectTrailPlan(invalid.code, invalid.message);

  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "issue", value: issue }, kind: "create-entity" }],
      intent: "triage.issue.create",
    }),
  });
}

export function planEditTrailTriageIssue(
  state: TrailPlanningState,
  command: EditTrailTriageIssueCommand,
): TrailPlanResult<TrailTriageIssuePlan> {
  const current = currentTriageIssue(state, command.expectedIssue);
  if (current === undefined) {
    return rejectTrailPlan("triage-issue-missing", `Triage Issue does not exist: ${command.expectedIssue.id}`);
  }
  if (!sameTriageIssue(current, command.expectedIssue)) {
    return rejectTrailPlan("triage-issue-changed", `Triage Issue changed before action: ${current.id}`);
  }
  const issue: TrailTriageIssue = {
    ...current,
    description: command.description,
    due: command.due,
    labelIds: [...command.labelIds],
    priority: command.priority,
    title: command.title,
  };
  const invalid = triageIssueValidationReason(state, issue);
  if (invalid !== undefined) return rejectTrailPlan(invalid.code, invalid.message);

  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "issue", value: issue },
        before: { kind: "issue", value: current },
        kind: "replace-entity",
      }],
      intent: "triage.issue.replace",
    }),
  });
}

export function planDeferTrailTriageIssue(
  state: TrailPlanningState,
  command: DeferTrailTriageIssueCommand,
): TrailPlanResult<TrailTriageIssuePlan> {
  const current = currentTriageIssue(state, command.expectedIssue);
  if (current === undefined) {
    return rejectTrailPlan("triage-issue-missing", `Triage Issue does not exist: ${command.expectedIssue.id}`);
  }
  if (!sameTriageIssue(current, command.expectedIssue)) {
    return rejectTrailPlan("triage-issue-changed", `Triage Issue changed before action: ${current.id}`);
  }
  if (command.due <= current.due) {
    return rejectTrailPlan("triage-defer-not-later", "Triage Defer must move Due later");
  }
  const issue: TrailTriageIssue = { ...current, due: command.due };
  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "issue", value: issue },
        before: { kind: "issue", value: current },
        kind: "replace-entity",
      }],
      intent: "triage.issue.replace",
    }),
  });
}

export function planDeleteTrailTriageIssue(
  state: TrailPlanningState,
  command: DeleteTrailTriageIssueCommand,
): TrailPlanResult<TrailTriageDeletePlan> {
  const current = currentTriageIssue(state, command.expectedIssue);
  if (current === undefined) {
    return rejectTrailPlan("triage-issue-missing", `Triage Issue does not exist: ${command.expectedIssue.id}`);
  }
  if (!sameTriageIssue(current, command.expectedIssue)) {
    return rejectTrailPlan("triage-issue-changed", `Triage Issue changed before action: ${current.id}`);
  }
  return readyTrailPlan({
    issueId: current.id,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ before: { kind: "issue", value: current }, kind: "delete-entity" }],
      intent: "triage.issue.delete",
    }),
  });
}

/**
 * Accept as Issue consumes an explicit standard Issue Composer draft. Triage
 * properties are not copied implicitly; automatic seeding belongs to UI draft
 * initialization before this command is submitted.
 */
export function planAcceptTrailTriageIssue(
  state: TrailPlanningState,
  command: AcceptTrailTriageIssueCommand,
): TrailPlanResult<TrailTriageAcceptPlan> {
  const source = currentTriageIssue(state, command.expectedIssue);
  if (source === undefined) {
    return rejectTrailPlan("triage-issue-missing", `Triage Issue does not exist: ${command.expectedIssue.id}`);
  }
  if (!sameTriageIssue(source, command.expectedIssue)) {
    return rejectTrailPlan("triage-issue-changed", `Triage Issue changed before Accept: ${source.id}`);
  }

  const target = planCreateTrailWorkflowIssueFromDraft(state, {
    commandId: command.commandId,
    description: command.description,
    due: command.due,
    effectiveAt: command.effectiveAt,
    estimate: command.estimate,
    issueId: command.targetIssueId,
    labelIds: command.labelIds,
    milestoneId: command.milestoneId,
    priority: command.priority,
    projectId: command.projectId,
    title: command.title,
  });
  if (target.kind !== "ready") return target;

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [
        ...target.plan.plan.effects,
        { before: { kind: "issue", value: source }, kind: "delete-entity" },
      ],
      intent: "triage.accept",
      preconditions: target.plan.plan.preconditions,
    }),
    sourceIssueId: source.id,
    targetIssue: target.plan.issue,
  });
}

/** Accept as Project consumes an explicit standard Project Composer draft. */
export function planConvertTrailTriageIssueToProject(
  state: TrailPlanningState,
  command: ConvertTrailTriageIssueToProjectCommand,
): TrailPlanResult<TrailTriageConvertProjectPlan> {
  const source = currentTriageIssue(state, command.expectedIssue);
  if (source === undefined) {
    return rejectTrailPlan("triage-issue-missing", `Triage Issue does not exist: ${command.expectedIssue.id}`);
  }
  if (!sameTriageIssue(source, command.expectedIssue)) {
    return rejectTrailPlan(
      "triage-issue-changed",
      `Triage Issue changed before Accept as Project: ${source.id}`,
    );
  }

  const target = planCreateTrailProjectFromDraft(state, {
    commandId: command.commandId,
    description: command.description,
    due: command.due,
    initiativeId: command.initiativeId,
    labelIds: command.labelIds,
    priority: command.priority,
    projectId: command.targetProjectId,
    title: command.title,
  });
  if (target.kind !== "ready") return target;

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [
        ...target.plan.plan.effects,
        { before: { kind: "issue", value: source }, kind: "delete-entity" },
      ],
      intent: "triage.convert-project",
      preconditions: target.plan.plan.preconditions,
    }),
    sourceIssueId: source.id,
    targetProject: target.plan.project,
  });
}
