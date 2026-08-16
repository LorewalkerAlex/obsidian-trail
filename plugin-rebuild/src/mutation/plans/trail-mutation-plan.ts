import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import type { TrailWorkspaceState } from "../../domain/model/trail-workspace-state";

export type TrailStateEffect =
  | { readonly after: TrailDomainEntity; readonly kind: "create-entity" }
  | {
      readonly after: TrailDomainEntity;
      readonly before: TrailDomainEntity;
      readonly kind: "replace-entity";
    }
  | { readonly before: TrailDomainEntity; readonly kind: "delete-entity" }
  | {
      readonly after: TrailConfiguration;
      readonly before: TrailConfiguration;
      readonly kind: "replace-configuration";
    }
  | {
      readonly after: TrailWorkspaceState;
      readonly before: TrailWorkspaceState;
      readonly kind: "replace-workspace-state";
    };

export type TrailPrecondition =
  | { readonly entityId: string; readonly kind: "entity-absent" }
  | { readonly entity: TrailDomainEntity; readonly kind: "entity-equals" }
  | { readonly configuration: TrailConfiguration; readonly kind: "configuration-equals" }
  | { readonly kind: "workspace-state-equals"; readonly workspaceState: TrailWorkspaceState };

export type TrailPostcondition = TrailPrecondition;

export interface TrailAffectedScope {
  readonly configuration: boolean;
  readonly entityIds: readonly string[];
  readonly workspaceState: boolean;
}

export interface TrailMutationPlan {
  readonly affectedScope: TrailAffectedScope;
  readonly commandId: string;
  readonly effects: readonly TrailStateEffect[];
  readonly intent: string;
  readonly postconditions: readonly TrailPostcondition[];
  readonly preconditions: readonly TrailPrecondition[];
}

export function trailDomainEntityId(entity: TrailDomainEntity): string {
  return entity.value.id;
}

function effectTarget(effect: TrailStateEffect): string {
  switch (effect.kind) {
    case "create-entity":
      return `entity:${trailDomainEntityId(effect.after)}`;
    case "replace-entity":
    case "delete-entity":
      return `entity:${trailDomainEntityId(effect.before)}`;
    case "replace-configuration":
      return "configuration";
    case "replace-workspace-state":
      return "workspace-state";
  }
}

function assertNonEmptyText(value: string, label: string): void {
  if (value.trim() === "") throw new Error(`${label} must be non-empty text`);
}

function assertReplaceIdentity(effect: Extract<TrailStateEffect, { kind: "replace-entity" }>): void {
  if (
    effect.before.kind !== effect.after.kind
    || trailDomainEntityId(effect.before) !== trailDomainEntityId(effect.after)
  ) {
    throw new Error("Replace effect must preserve entity kind and stable identity");
  }
}

function deriveEffectConditions(effects: readonly TrailStateEffect[]): {
  readonly postconditions: readonly TrailPostcondition[];
  readonly preconditions: readonly TrailPrecondition[];
} {
  const preconditions: TrailPrecondition[] = [];
  const postconditions: TrailPostcondition[] = [];
  for (const effect of effects) {
    switch (effect.kind) {
      case "create-entity":
        preconditions.push({ entityId: trailDomainEntityId(effect.after), kind: "entity-absent" });
        postconditions.push({ entity: effect.after, kind: "entity-equals" });
        break;
      case "replace-entity":
        assertReplaceIdentity(effect);
        preconditions.push({ entity: effect.before, kind: "entity-equals" });
        postconditions.push({ entity: effect.after, kind: "entity-equals" });
        break;
      case "delete-entity":
        preconditions.push({ entity: effect.before, kind: "entity-equals" });
        postconditions.push({ entityId: trailDomainEntityId(effect.before), kind: "entity-absent" });
        break;
      case "replace-configuration":
        preconditions.push({ configuration: effect.before, kind: "configuration-equals" });
        postconditions.push({ configuration: effect.after, kind: "configuration-equals" });
        break;
      case "replace-workspace-state":
        preconditions.push({ kind: "workspace-state-equals", workspaceState: effect.before });
        postconditions.push({ kind: "workspace-state-equals", workspaceState: effect.after });
        break;
    }
  }
  return { postconditions, preconditions };
}

function affectedScopeFor(
  effects: readonly TrailStateEffect[],
  conditions: readonly TrailPrecondition[],
): TrailAffectedScope {
  const entityIds = new Set<string>();
  let configuration = false;
  let workspaceState = false;

  for (const effect of effects) {
    switch (effect.kind) {
      case "create-entity":
        entityIds.add(trailDomainEntityId(effect.after));
        break;
      case "replace-entity":
      case "delete-entity":
        entityIds.add(trailDomainEntityId(effect.before));
        break;
      case "replace-configuration":
        configuration = true;
        break;
      case "replace-workspace-state":
        workspaceState = true;
        break;
    }
  }

  for (const condition of conditions) {
    switch (condition.kind) {
      case "entity-absent":
        entityIds.add(condition.entityId);
        break;
      case "entity-equals":
        entityIds.add(trailDomainEntityId(condition.entity));
        break;
      case "configuration-equals":
        configuration = true;
        break;
      case "workspace-state-equals":
        workspaceState = true;
        break;
    }
  }

  return {
    configuration,
    entityIds: [...entityIds].sort(),
    workspaceState,
  };
}

/** Builds one feature-agnostic logical delta; physical placement is intentionally later. */
export function createTrailMutationPlan(input: {
  readonly commandId: string;
  readonly effects: readonly TrailStateEffect[];
  readonly intent: string;
  readonly postconditions?: readonly TrailPostcondition[];
  readonly preconditions?: readonly TrailPrecondition[];
}): TrailMutationPlan {
  assertNonEmptyText(input.commandId, "Mutation command ID");
  assertNonEmptyText(input.intent, "Mutation intent");
  if (input.effects.length === 0) throw new Error("Mutation plan must contain at least one effect");

  const seenTargets = new Set<string>();
  for (const effect of input.effects) {
    if (effect.kind === "replace-entity") assertReplaceIdentity(effect);
    const target = effectTarget(effect);
    if (seenTargets.has(target)) {
      throw new Error(`Mutation plan contains multiple final effects for ${target}`);
    }
    seenTargets.add(target);
  }

  const derived = deriveEffectConditions(input.effects);
  const preconditions = [...derived.preconditions, ...(input.preconditions ?? [])];
  const postconditions = [...derived.postconditions, ...(input.postconditions ?? [])];

  return {
    affectedScope: affectedScopeFor(input.effects, [...preconditions, ...postconditions]),
    commandId: input.commandId,
    effects: [...input.effects],
    intent: input.intent,
    postconditions,
    preconditions,
  };
}
