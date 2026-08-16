import type { TrailTriageIssue, TrailWorkflowIssue } from "../model/trail-entities";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import {
  isTrailTerminalStatusDefinition,
  resolveTrailDefaultStatusDefinition,
  resolveTrailStatusDefinition,
} from "../rules/trail-status-rules";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailTriageIssueCommand {
  readonly commandId: string;
  readonly due: number;
  readonly issueId: string;
  readonly title: string;
}

export interface EditTrailTriageIssueCommand {
  readonly commandId: string;
  readonly due: number;
  readonly expectedIssue: TrailTriageIssue;
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
  readonly effectiveAt: number;
  readonly expectedIssue: TrailTriageIssue;
  readonly projectId: string;
  readonly targetIssueId: string;
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

export function planCreateTrailTriageIssue(
  state: TrailPlanningState,
  command: CreateTrailTriageIssueCommand,
): TrailPlanResult<TrailTriageIssuePlan> {
  if (trailPlanningEntityExists(state.domain, command.issueId)) {
    return rejectTrailPlan("entity-id-conflict", `Trail entity ID already exists: ${command.issueId}`);
  }
  const issue: TrailTriageIssue = {
    context: "triage",
    due: command.due,
    id: command.issueId,
    labelIds: [],
    title: command.title,
  };
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
  const issue: TrailTriageIssue = { ...current, due: command.due, title: command.title };
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

/** Accept creates a new Workflow identity; Triage Due intentionally does not carry over. */
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
  const project = state.domain.projectsById.get(command.projectId);
  if (project === undefined) {
    return rejectTrailPlan("project-missing", `Project does not exist: ${command.projectId}`);
  }
  const projectStatus = resolveTrailStatusDefinition(
    state.configuration,
    "project",
    project.statusDefinitionId,
  );
  if (projectStatus === undefined) {
    return rejectTrailPlan("project-status-invalid", `Project status is invalid: ${project.id}`);
  }
  if (isTrailTerminalStatusDefinition(projectStatus)) {
    return rejectTrailPlan(
      "project-terminal",
      "A terminal Project must be reopened before accepting non-terminal work",
    );
  }
  if (trailPlanningEntityExists(state.domain, command.targetIssueId)) {
    return rejectTrailPlan("entity-id-conflict", `Trail entity ID already exists: ${command.targetIssueId}`);
  }
  const backlog = resolveTrailDefaultStatusDefinition(state.configuration, "issue", "backlog");
  const targetIssue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: command.effectiveAt,
    description: source.description,
    estimate: source.estimate,
    id: command.targetIssueId,
    labelIds: [...source.labelIds],
    priority: source.priority,
    projectId: project.id,
    statusDefinitionId: backlog.id,
    title: source.title,
  };
  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [
        { after: { kind: "issue", value: targetIssue }, kind: "create-entity" },
        { before: { kind: "issue", value: source }, kind: "delete-entity" },
      ],
      intent: "triage.accept",
      preconditions: [{ entity: { kind: "project", value: project }, kind: "entity-equals" }],
    }),
    sourceIssueId: source.id,
    targetIssue,
  });
}
