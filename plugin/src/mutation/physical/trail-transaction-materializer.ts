import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import {
  sameTrailConfiguration,
  sameTrailDomainEntity,
  sameTrailWorkspaceState,
} from "../../domain/rules/trail-domain-equality";
import type {
  TrailMutationPlan,
  TrailStateEffect,
} from "../plans/trail-mutation-plan";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import {
  findTrailDomainEntity,
  type TrailCommittedRuntime,
} from "../../runtime/store/trail-runtime-store";
import {
  resolveTrailCurrentEntityPlacement,
  resolveTrailDesiredEntityPlacement,
} from "./trail-placement-resolver";
import type {
  TrailPersistenceOperation,
  TrailPersistenceTransactionPlan,
  TrailSourceTransitionPlan,
} from "./trail-persistence-transaction-plan";

function assertPlanPreconditions(plan: TrailMutationPlan, committed: TrailCommittedRuntime): void {
  for (const condition of plan.preconditions) {
    switch (condition.kind) {
      case "entity-absent":
        if (findTrailDomainEntity(committed.authoritative.domain, condition.entityId) !== undefined) {
          throw new Error(`Mutation precondition failed: entity must be absent: ${condition.entityId}`);
        }
        break;
      case "entity-equals": {
        const actual = findTrailDomainEntity(committed.authoritative.domain, condition.entity.value.id);
        if (actual === undefined || !sameTrailDomainEntity(actual, condition.entity)) {
          throw new Error(`Mutation precondition failed: entity changed: ${condition.entity.value.id}`);
        }
        break;
      }
      case "configuration-equals": {
        const actual = committed.authoritative.configuration;
        if (actual === null || !sameTrailConfiguration(actual, condition.configuration)) {
          throw new Error("Mutation precondition failed: Configuration changed");
        }
        break;
      }
      case "workspace-state-equals": {
        const actual = committed.authoritative.workspaceState;
        if (actual === null || !sameTrailWorkspaceState(actual, condition.workspaceState)) {
          throw new Error("Mutation precondition failed: Workspace State changed");
        }
        break;
      }
    }
  }
}

function cycleOptions(committed: TrailCommittedRuntime) {
  const timezone = committed.authoritative.configuration?.temporal.timezone;
  return timezone === undefined ? undefined : { cycleTimezone: timezone };
}

function domainMutationOperation(
  placement: ReturnType<typeof resolveTrailCurrentEntityPlacement>,
  mutation: Extract<TrailPersistenceOperation, { kind: "mutate-domain-source" }>["mutation"],
  committed: TrailCommittedRuntime,
): TrailPersistenceOperation {
  return {
    kind: "mutate-domain-source",
    mutation,
    options: placement.sourceKind === "cycles" ? cycleOptions(committed) : undefined,
    path: placement.path,
    sourceKind: placement.sourceKind,
  };
}

async function createEntityOperations(
  entity: TrailDomainEntity,
  committed: TrailCommittedRuntime,
  repository: Pick<TrailDomainSourceRepository, "list">,
): Promise<readonly TrailPersistenceOperation[]> {
  const placement = await resolveTrailDesiredEntityPlacement(entity, committed, repository);
  if (entity.kind === "initiative") {
    return [{
      kind: "create-domain-source",
      source: { initiative: entity.value, kind: "initiative", path: placement.path },
    }];
  }
  if (entity.kind === "project") {
    return [{
      kind: "create-domain-source",
      source: { kind: "project", path: placement.path, project: entity.value },
    }];
  }
  return [domainMutationOperation(
    placement,
    { after: entity, kind: "create" },
    committed,
  )];
}

async function replaceEntityTransaction(
  commandId: string,
  intent: string,
  before: TrailDomainEntity,
  after: TrailDomainEntity,
  committed: TrailCommittedRuntime,
  repository: Pick<TrailDomainSourceRepository, "list">,
): Promise<TrailPersistenceTransactionPlan> {
  const current = resolveTrailCurrentEntityPlacement(before, committed);
  const desired = await resolveTrailDesiredEntityPlacement(after, committed, repository);

  if (before.kind === "initiative" || before.kind === "project") {
    const operations: TrailPersistenceOperation[] = [domainMutationOperation(
      current,
      { after, before, kind: "replace" },
      committed,
    )];
    if (desired.renameFrom !== undefined) {
      operations.push({
        from: current.path,
        kind: "rename-domain-source",
        sourceKind: current.sourceKind,
        to: desired.path,
      });
    }
    return { commandId, intent, kind: "single", operations };
  }

  if (current.path === desired.path && current.sourceKind === desired.sourceKind) {
    return {
      commandId,
      intent,
      kind: "single",
      operations: [domainMutationOperation(
        current,
        { after, before, kind: "replace" },
        committed,
      )],
    };
  }

  const target = domainMutationOperation(
    desired,
    { after, kind: "create" },
    committed,
  );
  const source = domainMutationOperation(
    current,
    { before, kind: "delete" },
    committed,
  );
  const compensation = domainMutationOperation(
    desired,
    { before: after, kind: "delete" },
    committed,
  );
  return {
    commandId,
    compensation: [compensation],
    intent,
    kind: "source-transition",
    source: [source],
    target: [target],
  };
}

function deleteEntityOperations(
  entity: TrailDomainEntity,
  committed: TrailCommittedRuntime,
  allowRootSourceDelete: boolean,
): readonly TrailPersistenceOperation[] {
  const placement = resolveTrailCurrentEntityPlacement(entity, committed);
  if (entity.kind === "initiative" || entity.kind === "project") {
    if (!allowRootSourceDelete) {
      throw new Error(`${entity.kind} deletion requires Integrity Batch planning`);
    }
    const ownedIds = committed.ownership.sourceEntityIdsByPath.get(placement.path) ?? [];
    if (ownedIds.some((id) => id !== entity.value.id)) {
      throw new Error(`Cannot delete ${entity.kind} source while it still owns child entities`);
    }
    return [{ kind: "delete-domain-source", path: placement.path }];
  }
  return [domainMutationOperation(
    placement,
    { before: entity, kind: "delete" },
    committed,
  )];
}

async function singleEntityEffectPlan(
  plan: TrailMutationPlan,
  effect: Extract<TrailStateEffect, { kind: "create-entity" | "replace-entity" | "delete-entity" }>,
  committed: TrailCommittedRuntime,
  repository: Pick<TrailDomainSourceRepository, "list">,
): Promise<TrailPersistenceTransactionPlan> {
  switch (effect.kind) {
    case "create-entity":
      return {
        commandId: plan.commandId,
        intent: plan.intent,
        kind: "single",
        operations: await createEntityOperations(effect.after, committed, repository),
      };
    case "replace-entity":
      return replaceEntityTransaction(
        plan.commandId,
        plan.intent,
        effect.before,
        effect.after,
        committed,
        repository,
      );
    case "delete-entity":
      return {
        commandId: plan.commandId,
        intent: plan.intent,
        kind: "single",
        operations: deleteEntityOperations(effect.before, committed, false),
      };
  }
}

function pluginDataAfterEffects(
  plan: TrailMutationPlan,
  committed: TrailCommittedRuntime,
): { readonly operation?: TrailPersistenceOperation; readonly remaining: readonly TrailStateEffect[] } {
  const configuration = committed.authoritative.configuration;
  const workspaceState = committed.authoritative.workspaceState;
  const configurationEffect = plan.effects.find((effect) => effect.kind === "replace-configuration");
  const workspaceEffect = plan.effects.find((effect) => effect.kind === "replace-workspace-state");
  const remaining = plan.effects.filter((effect) => (
    effect.kind !== "replace-configuration" && effect.kind !== "replace-workspace-state"
  ));
  if (configurationEffect === undefined && workspaceEffect === undefined) return { remaining };
  if (configuration === null || workspaceState === null) {
    throw new Error("Plugin data mutation requires loaded Configuration and Workspace State");
  }
  const before: TrailPluginDataSnapshot = { configuration, workspaceState };
  const after: TrailPluginDataSnapshot = {
    configuration: configurationEffect?.after ?? configuration,
    workspaceState: workspaceEffect?.after ?? workspaceState,
  };
  return {
    operation: { after, before, kind: "save-plugin-data" },
    remaining,
  };
}

async function tryCreateDeleteSourceTransition(
  plan: TrailMutationPlan,
  effects: readonly TrailStateEffect[],
  committed: TrailCommittedRuntime,
  repository: Pick<TrailDomainSourceRepository, "list">,
): Promise<TrailSourceTransitionPlan | undefined> {
  if (effects.length !== 2) return undefined;
  const create = effects.find((effect): effect is Extract<TrailStateEffect, { kind: "create-entity" }> => effect.kind === "create-entity");
  const remove = effects.find((effect): effect is Extract<TrailStateEffect, { kind: "delete-entity" }> => effect.kind === "delete-entity");
  if (create === undefined || remove === undefined) return undefined;

  const targetOperations = await createEntityOperations(create.after, committed, repository);
  const sourceOperations = deleteEntityOperations(remove.before, committed, false);
  if (targetOperations.length !== 1 || sourceOperations.length !== 1) return undefined;
  const target = targetOperations[0];
  const source = sourceOperations[0];
  if (target === undefined || source === undefined) return undefined;
  if (source.kind !== "mutate-domain-source" || source.mutation.kind !== "delete") return undefined;

  let targetPath: string;
  let compensation: TrailPersistenceOperation;
  if (target.kind === "mutate-domain-source" && target.mutation.kind === "create") {
    targetPath = target.path;
    compensation = {
      ...target,
      mutation: { before: create.after, kind: "delete" },
    };
  } else if (target.kind === "create-domain-source") {
    targetPath = target.source.path;
    compensation = { kind: "delete-domain-source", path: target.source.path };
  } else {
    return undefined;
  }

  if (targetPath === source.path) return undefined;

  return {
    commandId: plan.commandId,
    compensation: [compensation],
    intent: plan.intent,
    kind: "source-transition",
    source: [source],
    target: [target],
  };
}

/** Materializes against the latest committed Runtime after dequeuing. */
export async function materializeTrailPersistenceTransactionPlan(
  plan: TrailMutationPlan,
  committed: TrailCommittedRuntime,
  repository: Pick<TrailDomainSourceRepository, "list">,
): Promise<TrailPersistenceTransactionPlan> {
  assertPlanPreconditions(plan, committed);

  const pluginData = pluginDataAfterEffects(plan, committed);
  if (pluginData.remaining.length === 0) {
    if (pluginData.operation === undefined) throw new Error("Mutation plan has no materializable effects");
    return {
      commandId: plan.commandId,
      intent: plan.intent,
      kind: "single",
      operations: [pluginData.operation],
    };
  }

  if (pluginData.operation === undefined && pluginData.remaining.length === 1) {
    const effect = pluginData.remaining[0];
    if (effect === undefined || (
      effect.kind !== "create-entity"
      && effect.kind !== "replace-entity"
      && effect.kind !== "delete-entity"
    )) throw new Error("Unsupported single logical effect");
    return singleEntityEffectPlan(plan, effect, committed, repository);
  }

  if (pluginData.operation === undefined) {
    const transition = await tryCreateDeleteSourceTransition(
      plan,
      pluginData.remaining,
      committed,
      repository,
    );
    if (transition !== undefined) return transition;
  }

  const prepare: TrailPersistenceOperation[] = [];
  const destructive: TrailPersistenceOperation[] = [];
  if (pluginData.operation !== undefined) prepare.push(pluginData.operation);

  for (const effect of pluginData.remaining) {
    if (effect.kind === "replace-entity") {
      const materialized = await replaceEntityTransaction(
        plan.commandId,
        plan.intent,
        effect.before,
        effect.after,
        committed,
        repository,
      );
      if (materialized.kind !== "single") {
        throw new Error("Moving Replace inside an Integrity Batch requires a dedicated staged planner");
      }
      prepare.push(...materialized.operations);
    } else if (effect.kind === "create-entity") {
      prepare.push(...await createEntityOperations(effect.after, committed, repository));
    } else if (effect.kind === "delete-entity") {
      destructive.push(...deleteEntityOperations(effect.before, committed, true));
    }
  }

  return {
    commandId: plan.commandId,
    intent: plan.intent,
    kind: "integrity-batch",
    stages: [
      ...(prepare.length === 0 ? [] : [{ name: "prepare" as const, operations: prepare }]),
      ...(destructive.length === 0 ? [] : [{ name: "destructive" as const, operations: destructive }]),
    ],
  };
}
