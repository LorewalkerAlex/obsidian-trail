import type {
  TrailCycle,
  TrailInitiative,
  TrailMilestone,
} from "../../domain/model/trail-core-entities";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";

export type TrailMutationEntity =
  | { readonly kind: "initiative"; readonly value: TrailInitiative }
  | { readonly kind: "project"; readonly value: TrailProject }
  | { readonly kind: "milestone"; readonly value: TrailMilestone }
  | { readonly kind: "triage-issue"; readonly value: TrailTriageIssue }
  | { readonly kind: "workflow-issue"; readonly value: TrailWorkflowIssue }
  | { readonly kind: "cycle"; readonly value: TrailCycle };

export type TrailStateEffect =
  | { readonly kind: "create"; readonly after: TrailMutationEntity }
  | {
      readonly kind: "replace";
      readonly after: TrailMutationEntity;
      readonly before: TrailMutationEntity;
    }
  | { readonly kind: "delete"; readonly before: TrailMutationEntity };

export type TrailPrecondition =
  | { readonly entityId: string; readonly kind: "entity-absent" }
  | { readonly entity: TrailMutationEntity; readonly kind: "entity-equals" };

export type TrailPostcondition = TrailPrecondition;

export interface TrailAffectedScope {
  readonly entityIds: readonly string[];
}

export interface TrailMutationPlan {
  readonly affectedScope: TrailAffectedScope;
  readonly commandId: string;
  readonly effects: readonly TrailStateEffect[];
  readonly intent: string;
  readonly postconditions: readonly TrailPostcondition[];
  readonly preconditions: readonly TrailPrecondition[];
}

export function initiativeMutationEntity(
  initiative: TrailInitiative,
): TrailMutationEntity {
  return { kind: "initiative", value: initiative };
}

export function projectMutationEntity(project: TrailProject): TrailMutationEntity {
  return { kind: "project", value: project };
}

export function milestoneMutationEntity(
  milestone: TrailMilestone,
): TrailMutationEntity {
  return { kind: "milestone", value: milestone };
}

export function triageIssueMutationEntity(
  issue: TrailTriageIssue,
): TrailMutationEntity {
  return { kind: "triage-issue", value: issue };
}

export function workflowIssueMutationEntity(
  issue: TrailWorkflowIssue,
): TrailMutationEntity {
  return { kind: "workflow-issue", value: issue };
}

export function cycleMutationEntity(cycle: TrailCycle): TrailMutationEntity {
  return { kind: "cycle", value: cycle };
}

export function trailMutationEntityId(entity: TrailMutationEntity): string {
  return entity.value.id;
}

function effectEntityId(effect: TrailStateEffect): string {
  return effect.kind === "create"
    ? trailMutationEntityId(effect.after)
    : trailMutationEntityId(effect.before);
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim() === "") {
    throw new Error(`${label} must be non-empty text`);
  }
}

function assertReplaceIdentity(
  effect: Extract<TrailStateEffect, { kind: "replace" }>,
): void {
  if (
    effect.before.kind !== effect.after.kind
    || trailMutationEntityId(effect.before) !== trailMutationEntityId(effect.after)
  ) {
    throw new Error("Replace effect must preserve entity kind and stable identity");
  }
}

function deriveConditions(effects: readonly TrailStateEffect[]): {
  readonly postconditions: readonly TrailPostcondition[];
  readonly preconditions: readonly TrailPrecondition[];
} {
  const preconditions: TrailPrecondition[] = [];
  const postconditions: TrailPostcondition[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case "create":
        preconditions.push({
          entityId: trailMutationEntityId(effect.after),
          kind: "entity-absent",
        });
        postconditions.push({ entity: effect.after, kind: "entity-equals" });
        break;
      case "replace":
        assertReplaceIdentity(effect);
        preconditions.push({ entity: effect.before, kind: "entity-equals" });
        postconditions.push({ entity: effect.after, kind: "entity-equals" });
        break;
      case "delete":
        preconditions.push({ entity: effect.before, kind: "entity-equals" });
        postconditions.push({
          entityId: trailMutationEntityId(effect.before),
          kind: "entity-absent",
        });
        break;
    }
  }

  return { postconditions, preconditions };
}

/**
 * Builds the feature-agnostic logical plan consumed by optimistic Runtime
 * projection. Physical placement and persistence topology are intentionally later.
 */
export function createTrailMutationPlan(input: {
  readonly commandId: string;
  readonly effects: readonly TrailStateEffect[];
  readonly intent: string;
  readonly preconditions?: readonly TrailPrecondition[];
  readonly postconditions?: readonly TrailPostcondition[];
}): TrailMutationPlan {
  assertNonEmpty(input.commandId, "Mutation command ID");
  assertNonEmpty(input.intent, "Mutation intent");

  const seenEntityIds = new Set<string>();
  const entityIds: string[] = [];
  for (const effect of input.effects) {
    const entityId = effectEntityId(effect);
    if (seenEntityIds.has(entityId)) {
      throw new Error(
        `Mutation plan contains multiple final effects for entity ${entityId}`,
      );
    }
    seenEntityIds.add(entityId);
    entityIds.push(entityId);
  }

  const conditions = deriveConditions(input.effects);
  const preconditions = [
    ...conditions.preconditions,
    ...(input.preconditions ?? []),
  ];
  const postconditions = [
    ...conditions.postconditions,
    ...(input.postconditions ?? []),
  ];
  for (const condition of [...preconditions, ...postconditions]) {
    const entityId = condition.kind === "entity-absent"
      ? condition.entityId
      : trailMutationEntityId(condition.entity);
    if (!seenEntityIds.has(entityId)) {
      seenEntityIds.add(entityId);
      entityIds.push(entityId);
    }
  }

  return {
    affectedScope: { entityIds: entityIds.slice().sort() },
    commandId: input.commandId,
    effects: [...input.effects],
    intent: input.intent,
    postconditions,
    preconditions,
  };
}

/** Combines logical subplans from one command into one atomic pending plan. */
export function mergeTrailMutationPlans(input: {
  readonly commandId: string;
  readonly intent: string;
  readonly plans: readonly TrailMutationPlan[];
}): TrailMutationPlan {
  for (const plan of input.plans) {
    if (plan.commandId !== input.commandId) {
      throw new Error("Merged mutation plans must share one command ID");
    }
  }
  const merged = createTrailMutationPlan({
    commandId: input.commandId,
    effects: input.plans.flatMap((plan) => plan.effects),
    intent: input.intent,
  });
  return {
    ...merged,
    affectedScope: {
      entityIds: [...new Set(
        input.plans.flatMap((plan) => plan.affectedScope.entityIds),
      )].sort(),
    },
    postconditions: input.plans.flatMap((plan) => plan.postconditions),
    preconditions: input.plans.flatMap((plan) => plan.preconditions),
  };
}

export function isTrailMutationPlan(value: unknown): value is TrailMutationPlan {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TrailMutationPlan>;
  return typeof candidate.commandId === "string"
    && typeof candidate.intent === "string"
    && Array.isArray(candidate.effects)
    && candidate.affectedScope !== undefined
    && Array.isArray(candidate.preconditions)
    && Array.isArray(candidate.postconditions);
}
