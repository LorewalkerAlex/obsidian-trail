import type {
  TrailCycle,
  TrailDomainEntity,
  TrailInitiative,
  TrailIssue,
  TrailMilestone,
  TrailProject,
} from "../../domain/model/trail-entities";
import type { TrailMutationPlan, TrailStateEffect } from "../../mutation/plans/trail-mutation-plan";
import type {
  TrailAuthoritativeState,
  TrailDomainState,
  TrailRuntimeState,
  TrailRuntimeStore,
} from "../store/trail-runtime-store";

interface MutableTrailDomainState {
  readonly cyclesById: Map<string, TrailCycle>;
  readonly initiativesById: Map<string, TrailInitiative>;
  readonly issuesById: Map<string, TrailIssue>;
  readonly milestonesById: Map<string, TrailMilestone>;
  readonly projectsById: Map<string, TrailProject>;
}

function cloneDomain(domain: TrailDomainState): MutableTrailDomainState {
  return {
    cyclesById: new Map(domain.cyclesById),
    initiativesById: new Map(domain.initiativesById),
    issuesById: new Map(domain.issuesById),
    milestonesById: new Map(domain.milestonesById),
    projectsById: new Map(domain.projectsById),
  };
}

function assignEntity(
  domain: MutableTrailDomainState,
  entity: TrailDomainEntity,
): void {
  switch (entity.kind) {
    case "initiative":
      domain.initiativesById.set(entity.value.id, entity.value);
      break;
    case "project":
      domain.projectsById.set(entity.value.id, entity.value);
      break;
    case "milestone":
      domain.milestonesById.set(entity.value.id, entity.value);
      break;
    case "issue":
      domain.issuesById.set(entity.value.id, entity.value);
      break;
    case "cycle":
      domain.cyclesById.set(entity.value.id, entity.value);
      break;
  }
}

function deleteEntity(
  domain: MutableTrailDomainState,
  entity: TrailDomainEntity,
): void {
  switch (entity.kind) {
    case "initiative":
      domain.initiativesById.delete(entity.value.id);
      break;
    case "project":
      domain.projectsById.delete(entity.value.id);
      break;
    case "milestone":
      domain.milestonesById.delete(entity.value.id);
      break;
    case "issue":
      domain.issuesById.delete(entity.value.id);
      break;
    case "cycle":
      domain.cyclesById.delete(entity.value.id);
      break;
  }
}

interface MutableTrailAuthoritativeState {
  configuration: TrailAuthoritativeState["configuration"];
  readonly domain: MutableTrailDomainState;
  workspaceState: TrailAuthoritativeState["workspaceState"];
}

function applyEffect(
  state: MutableTrailAuthoritativeState,
  effect: TrailStateEffect,
): void {
  switch (effect.kind) {
    case "create-entity":
    case "replace-entity":
      assignEntity(state.domain, effect.after);
      break;
    case "delete-entity":
      deleteEntity(state.domain, effect.before);
      break;
    case "replace-configuration":
      state.configuration = effect.after;
      break;
    case "replace-workspace-state":
      state.workspaceState = effect.after;
      break;
  }
}

/** Replays only logical effects; page sorting and presentation belong to Query. */
export function projectTrailEffectiveAuthoritativeState(
  state: TrailRuntimeState,
): TrailAuthoritativeState {
  const projected = {
    configuration: state.committed.authoritative.configuration,
    domain: cloneDomain(state.committed.authoritative.domain),
    workspaceState: state.committed.authoritative.workspaceState,
  };
  for (const plan of state.pending) {
    for (const effect of plan.effects) applyEffect(projected, effect);
  }
  return projected;
}

export function addTrailPendingPlan(
  store: TrailRuntimeStore,
  plan: TrailMutationPlan,
): void {
  store.setState((state) => {
    if (state.pending.some((candidate) => candidate.commandId === plan.commandId)) {
      throw new Error(`Duplicate pending Trail command ID: ${plan.commandId}`);
    }
    return { pending: [...state.pending, plan] };
  });
}

export function removeTrailPendingPlan(
  store: TrailRuntimeStore,
  commandId: string,
): void {
  store.setState((state) => ({
    pending: state.pending.filter((plan) => plan.commandId !== commandId),
  }));
}
