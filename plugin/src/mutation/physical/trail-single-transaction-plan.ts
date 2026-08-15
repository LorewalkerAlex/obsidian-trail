import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import { TRAIL_PROJECTLESS_ISSUES_PATH } from "../../markdown/schema/trail-paths";
import type { TrailCommittedRuntime } from "../../runtime/store/trail-runtime-store";
import {
  type TrailMutationEntity,
  type TrailMutationPlan,
  type TrailStateEffect,
} from "../plans/trail-mutation-plan";
import {
  resolveTrailEntityPlacement,
  type TrailPlacementEnvironment,
} from "./trail-placement-resolver";

export type TrailSingleTransactionOperation =
  | { readonly kind: "project-create"; readonly project: TrailProject }
  | { readonly kind: "triage-create"; readonly issue: TrailTriageIssue }
  | {
      readonly expectedIssue: TrailTriageIssue;
      readonly issue: TrailTriageIssue;
      readonly kind: "triage-replace";
    }
  | { readonly expectedIssue: TrailTriageIssue; readonly kind: "triage-delete" }
  | {
      readonly expectedProject: TrailProject;
      readonly issue: TrailWorkflowIssue;
      readonly kind: "workflow-create";
    }
  | {
      readonly expectedIssue: TrailWorkflowIssue;
      readonly issue: TrailWorkflowIssue;
      readonly kind: "workflow-replace";
    }
  | { readonly expectedIssue: TrailWorkflowIssue; readonly kind: "workflow-delete" };

export interface TrailSingleTransactionPlan {
  readonly commandId: string;
  readonly intent: string;
  readonly operation: TrailSingleTransactionOperation;
  readonly sourcePath: string;
}

function effectEntity(effect: TrailStateEffect): TrailMutationEntity {
  return effect.kind === "create" ? effect.after : effect.before;
}

function expectedProjectForCreate(
  logicalPlan: TrailMutationPlan,
  issue: TrailWorkflowIssue,
): TrailProject {
  const projectId = issue.projectId;
  if (projectId === undefined) {
    throw new Error("Projectless Workflow Issue persistence is not active yet");
  }
  for (const condition of logicalPlan.preconditions) {
    if (
      condition.kind === "entity-equals"
      && condition.entity.kind === "project"
      && condition.entity.value.id === projectId
    ) {
      return condition.entity.value;
    }
  }
  throw new Error(`Workflow Issue create is missing expected Project precondition: ${projectId}`);
}

function operationForEffect(
  logicalPlan: TrailMutationPlan,
  effect: TrailStateEffect,
): TrailSingleTransactionOperation {
  const entity = effectEntity(effect);
  switch (entity.kind) {
    case "initiative":
      throw new Error("Initiative single-source persistence behavior is not active yet");
    case "project":
      if (effect.kind !== "create") {
        throw new Error("Project replace/delete is not an active single-source mutation yet");
      }
      return { kind: "project-create", project: effect.after.value as TrailProject };
    case "milestone":
      throw new Error("Milestone single-source persistence behavior is not active yet");
    case "triage-issue":
      if (effect.kind === "create") {
        return { kind: "triage-create", issue: effect.after.value as TrailTriageIssue };
      }
      if (effect.kind === "replace") {
        return {
          expectedIssue: effect.before.value as TrailTriageIssue,
          issue: effect.after.value as TrailTriageIssue,
          kind: "triage-replace",
        };
      }
      return {
        expectedIssue: effect.before.value as TrailTriageIssue,
        kind: "triage-delete",
      };
    case "workflow-issue":
      if (effect.kind === "create") {
        const issue = effect.after.value as TrailWorkflowIssue;
        return {
          expectedProject: expectedProjectForCreate(logicalPlan, issue),
          issue,
          kind: "workflow-create",
        };
      }
      if (effect.kind === "replace") {
        return {
          expectedIssue: effect.before.value as TrailWorkflowIssue,
          issue: effect.after.value as TrailWorkflowIssue,
          kind: "workflow-replace",
        };
      }
      return {
        expectedIssue: effect.before.value as TrailWorkflowIssue,
        kind: "workflow-delete",
      };
    case "cycle":
      throw new Error("Cycle single-source persistence behavior is not active yet");
  }
}

/** Materializes one logical effect against the latest committed source ownership. */
export async function materializeTrailSingleTransactionPlan(
  logicalPlan: TrailMutationPlan,
  committed: TrailCommittedRuntime,
  environment: TrailPlacementEnvironment = {},
): Promise<TrailSingleTransactionPlan> {
  if (logicalPlan.effects.length !== 1) {
    throw new Error("Single transaction materialization requires exactly one logical effect");
  }
  const effect = logicalPlan.effects[0];
  if (effect === undefined) {
    throw new Error("Single transaction materialization requires one logical effect");
  }
  const operation = operationForEffect(logicalPlan, effect);
  const entity = effectEntity(effect);
  const sourcePath = await resolveTrailEntityPlacement(entity, committed, environment);
  if (entity.kind === "workflow-issue" && sourcePath === TRAIL_PROJECTLESS_ISSUES_PATH) {
    throw new Error("Projectless Workflow Issue persistence is not active yet");
  }
  return {
    commandId: logicalPlan.commandId,
    intent: logicalPlan.intent,
    operation,
    sourcePath,
  };
}
