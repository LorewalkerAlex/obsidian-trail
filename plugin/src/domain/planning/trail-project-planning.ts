import type { TrailProject } from "../model/trail-entities";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import { findTrailLabelSelectionViolations } from "../rules/trail-label-rules";
import { findTrailNonTerminalProjectChildIssue } from "../rules/trail-project-rules";
import {
  resolveTrailDefaultStatusDefinition,
  resolveTrailStatusDefinition,
} from "../rules/trail-status-rules";
import { validateTrailProject } from "../validation/trail-record-validation";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailProjectCommand {
  readonly commandId: string;
  readonly projectId: string;
  readonly title: string;
}

export interface ChangeTrailProjectStatusCommand {
  readonly commandId: string;
  readonly expectedProject: TrailProject;
  readonly targetStatusDefinitionId: string;
}

export interface ChangeTrailProjectInitiativeCommand {
  readonly commandId: string;
  readonly expectedProject: TrailProject;
  readonly targetInitiativeId?: string;
}

export interface EditTrailProjectPropertiesCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due?: number;
  readonly expectedProject: TrailProject;
  readonly labelIds: readonly string[];
  readonly priority?: TrailProject["priority"];
  readonly title: string;
}

export interface TrailProjectPlan {
  readonly plan: TrailMutationPlan;
  readonly project: TrailProject;
}

export function planCreateTrailProject(
  state: TrailPlanningState,
  command: CreateTrailProjectCommand,
): TrailPlanResult<TrailProjectPlan> {
  if (trailPlanningEntityExists(state.domain, command.projectId)) {
    return rejectTrailPlan("entity-id-conflict", `Trail entity ID already exists: ${command.projectId}`);
  }
  const status = resolveTrailDefaultStatusDefinition(
    state.configuration,
    "project",
    "unstarted",
  );
  const project: TrailProject = {
    id: command.projectId,
    labelIds: [],
    statusDefinitionId: status.id,
    title: command.title,
  };
  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "project", value: project }, kind: "create-entity" }],
      intent: "workflow.project.create",
    }),
    project,
  });
}

/**
 * Replaces the complete lightweight Project details snapshot while preserving
 * Project identity, Status, and Initiative relationship ownership.
 */
export function planEditTrailProjectProperties(
  state: TrailPlanningState,
  command: EditTrailProjectPropertiesCommand,
): TrailPlanResult<TrailProjectPlan> {
  const current = state.domain.projectsById.get(command.expectedProject.id);
  if (current === undefined) {
    return rejectTrailPlan(
      "project-missing",
      `Project does not exist: ${command.expectedProject.id}`,
    );
  }
  if (!sameTrailDomainEntity(
    { kind: "project", value: current },
    { kind: "project", value: command.expectedProject },
  )) {
    return rejectTrailPlan(
      "project-changed",
      `Project changed before action: ${command.expectedProject.id}`,
    );
  }

  const project: TrailProject = {
    ...current,
    description: command.description,
    due: command.due,
    labelIds: [...command.labelIds],
    priority: command.priority,
    title: command.title,
  };
  const recordIssues = validateTrailProject(project);
  if (recordIssues.length > 0) {
    return rejectTrailPlan(
      "project-invalid",
      recordIssues.map(({ message }) => message).join("; "),
    );
  }

  const labelViolations = findTrailLabelSelectionViolations(
    state.configuration,
    "project",
    project.labelIds,
  );
  const labelViolation = labelViolations[0];
  if (labelViolation !== undefined) {
    switch (labelViolation.kind) {
      case "label-missing":
        return rejectTrailPlan(
          "label-missing",
          `Project references unknown Label ${labelViolation.labelId}`,
        );
      case "label-group-missing":
        return rejectTrailPlan(
          "label-group-missing",
          `Label ${labelViolation.labelId} references unknown LabelGroup ${labelViolation.groupId}`,
        );
      case "label-scope":
        return rejectTrailPlan(
          "label-scope",
          `Label ${labelViolation.labelId} is not registered for Projects`,
        );
      case "single-selection":
        return rejectTrailPlan(
          "label-group-single-selection",
          `Project selects multiple Labels from single-select group ${labelViolation.groupId}`,
        );
    }
  }

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "project", value: project },
        before: { kind: "project", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.project.edit-properties",
    }),
    project,
  });
}

export function planChangeTrailProjectStatus(
  state: TrailPlanningState,
  command: ChangeTrailProjectStatusCommand,
): TrailPlanResult<TrailProjectPlan> {
  const current = state.domain.projectsById.get(command.expectedProject.id);
  if (current === undefined) {
    return rejectTrailPlan(
      "project-missing",
      `Project does not exist: ${command.expectedProject.id}`,
    );
  }
  if (!sameTrailDomainEntity(
    { kind: "project", value: current },
    { kind: "project", value: command.expectedProject },
  )) {
    return rejectTrailPlan(
      "project-changed",
      `Project changed before action: ${command.expectedProject.id}`,
    );
  }

  const currentStatus = resolveTrailStatusDefinition(
    state.configuration,
    "project",
    current.statusDefinitionId,
  );
  const targetStatus = resolveTrailStatusDefinition(
    state.configuration,
    "project",
    command.targetStatusDefinitionId,
  );
  if (currentStatus === undefined || targetStatus === undefined) {
    return rejectTrailPlan("project-status-invalid", "Project status reference is invalid");
  }
  if (targetStatus.category === "completed") {
    const activeChild = findTrailNonTerminalProjectChildIssue(
      state.configuration,
      state.domain.issuesById.values(),
      current.id,
    );
    if (activeChild !== undefined) {
      return rejectTrailPlan(
        "project-active-child",
        `Project cannot be completed while Issue ${activeChild.id} is non-terminal`,
      );
    }
  }

  const project: TrailProject = targetStatus.id === current.statusDefinitionId
    ? current
    : { ...current, statusDefinitionId: targetStatus.id };
  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "project", value: project },
        before: { kind: "project", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.project.change-status",
    }),
    project,
  });
}

export function planChangeTrailProjectInitiative(
  state: TrailPlanningState,
  command: ChangeTrailProjectInitiativeCommand,
): TrailPlanResult<TrailProjectPlan> {
  const current = state.domain.projectsById.get(command.expectedProject.id);
  if (current === undefined) {
    return rejectTrailPlan(
      "project-missing",
      `Project does not exist: ${command.expectedProject.id}`,
    );
  }
  if (!sameTrailDomainEntity(
    { kind: "project", value: current },
    { kind: "project", value: command.expectedProject },
  )) {
    return rejectTrailPlan(
      "project-changed",
      `Project changed before action: ${command.expectedProject.id}`,
    );
  }

  const targetInitiative = command.targetInitiativeId === undefined
    ? undefined
    : state.domain.initiativesById.get(command.targetInitiativeId);
  if (command.targetInitiativeId !== undefined && targetInitiative === undefined) {
    return rejectTrailPlan(
      "initiative-missing",
      `Initiative does not exist: ${command.targetInitiativeId}`,
    );
  }

  const project: TrailProject = targetInitiative?.id === current.initiativeId
    ? current
    : { ...current, initiativeId: targetInitiative?.id };
  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "project", value: project },
        before: { kind: "project", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.project.change-initiative",
      preconditions: targetInitiative === undefined
        ? []
        : [{ entity: { kind: "initiative", value: targetInitiative }, kind: "entity-equals" }],
    }),
    project,
  });
}