import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import {
  sameTrailConfiguration,
  sameTrailDomainEntity,
  sameTrailWorkspaceState,
} from "../../domain/rules/trail-domain-equality";
import {
  validateTrailWorkspaceGraph,
  type TrailWorkspaceValidationIssue,
} from "../../domain/validation/trail-workspace-validation";
import type {
  TrailMutationPlan,
  TrailStateEffect,
} from "../plans/trail-mutation-plan";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import { projectTrailAuthoritativeStateWithEffects } from "../../runtime/projection/trail-runtime-projection";
import {
  findTrailDomainEntity,
  type TrailAuthoritativeState,
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

export class TrailIntegrityBatchMaterializationError extends Error {
  public constructor(
    message: string,
    readonly validationIssues: readonly TrailWorkspaceValidationIssue[],
  ) {
    super(message);
    this.name = "TrailIntegrityBatchMaterializationError";
  }
}

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

function rootSourceDeleteOperation(
  entity: TrailDomainEntity,
  committed: TrailCommittedRuntime,
): TrailPersistenceOperation {
  if (entity.kind !== "initiative" && entity.kind !== "project") {
    throw new Error(`Entity kind ${entity.kind} is not file-backed root state`);
  }
  const placement = resolveTrailCurrentEntityPlacement(entity, committed);
  const ownedIds = committed.ownership.sourceEntityIdsByPath.get(placement.path) ?? [];
  const beforeEntities = ownedIds.map((entityId) => {
    const current = findTrailDomainEntity(committed.authoritative.domain, entityId);
    if (current === undefined) {
      throw new Error(`Root source ownership cannot resolve entity before delete: ${entityId}`);
    }
    return current;
  });
  if (!beforeEntities.some((current) => sameTrailDomainEntity(current, entity))) {
    throw new Error(`Root source does not contain expected ${entity.kind}: ${entity.value.id}`);
  }
  return {
    beforeEntities,
    kind: "delete-domain-source",
    path: placement.path,
    sourceKind: placement.sourceKind,
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
    return [rootSourceDeleteOperation(entity, committed)];
  }
  return [domainMutationOperation(
    placement,
    { before: entity, kind: "delete" },
    committed,
  )];
}

function initiativeHasProjectReferences(
  initiativeId: string,
  committed: TrailCommittedRuntime,
): boolean {
  for (const project of committed.authoritative.domain.projectsById.values()) {
    if (project.initiativeId === initiativeId) return true;
  }
  return false;
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
    case "delete-entity": {
      const rootDelete = effect.before.kind === "initiative";
      if (rootDelete && initiativeHasProjectReferences(effect.before.value.id, committed)) {
        throw new Error("Initiative deletion with Project references requires Integrity Batch planning");
      }
      return {
        commandId: plan.commandId,
        intent: plan.intent,
        kind: "single",
        operations: deleteEntityOperations(effect.before, committed, rootDelete),
      };
    }
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

function entityEffectId(effect: TrailStateEffect): string | undefined {
  switch (effect.kind) {
    case "create-entity":
      return effect.after.value.id;
    case "replace-entity":
    case "delete-entity":
      return effect.before.value.id;
    case "replace-configuration":
    case "replace-workspace-state":
      return undefined;
  }
}

function requireEffectBeforeMatches(
  effect: TrailStateEffect,
  current: TrailDomainEntity,
): void {
  if (
    (effect.kind !== "replace-entity" && effect.kind !== "delete-entity")
    || !sameTrailDomainEntity(effect.before, current)
  ) {
    throw new Error(`Project deletion effect does not match current entity: ${current.value.id}`);
  }
}

/**
 * Project deletion is one carrier destruction plus destination-first Issue moves.
 * Child records are not individually deleted from the Project file because the
 * final root-source deletion removes that authoritative carrier as one operation.
 */
async function tryMaterializeProjectDelete(
  plan: TrailMutationPlan,
  effects: readonly TrailStateEffect[],
  committed: TrailCommittedRuntime,
  repository: Pick<TrailDomainSourceRepository, "list">,
): Promise<TrailPersistenceTransactionPlan | undefined> {
  const projectDeletes = effects.filter((effect): effect is Extract<TrailStateEffect, { kind: "delete-entity" }> => (
    effect.kind === "delete-entity" && effect.before.kind === "project"
  ));
  if (projectDeletes.length === 0) return undefined;
  if (projectDeletes.length !== 1) {
    throw new Error("Project deletion materialization supports exactly one Project root");
  }

  const projectDelete = projectDeletes[0];
  if (projectDelete === undefined) throw new Error("Project deletion effect is unavailable");
  const project = projectDelete.before;
  const placement = resolveTrailCurrentEntityPlacement(project, committed);
  const ownedIds = [...(committed.ownership.sourceEntityIdsByPath.get(placement.path) ?? [])].sort();
  const effectsById = new Map<string, TrailStateEffect>();

  for (const effect of effects) {
    const entityId = entityEffectId(effect);
    if (entityId === undefined) {
      throw new Error("Project deletion cannot include plugin-data effects");
    }
    if (effectsById.has(entityId)) {
      throw new Error(`Project deletion contains multiple effects for entity: ${entityId}`);
    }
    effectsById.set(entityId, effect);
  }

  if (effectsById.size !== ownedIds.length) {
    throw new Error("Project deletion must resolve every entity owned by the Project source exactly once");
  }
  for (const entityId of effectsById.keys()) {
    if (!ownedIds.includes(entityId)) {
      throw new Error(`Project deletion contains an effect outside the Project source: ${entityId}`);
    }
  }

  const targetOperations: TrailPersistenceOperation[] = [];
  for (const entityId of ownedIds) {
    const current = findTrailDomainEntity(committed.authoritative.domain, entityId);
    const effect = effectsById.get(entityId);
    if (current === undefined || effect === undefined) {
      throw new Error(`Project source ownership cannot be resolved for deletion: ${entityId}`);
    }
    requireEffectBeforeMatches(effect, current);

    switch (current.kind) {
      case "project":
        if (
          current.value.id !== project.value.id
          || effect.kind !== "delete-entity"
          || effect.before.kind !== "project"
        ) {
          throw new Error("Project deletion must delete the owning Project root");
        }
        break;
      case "milestone":
        if (
          current.value.projectId !== project.value.id
          || effect.kind !== "delete-entity"
          || effect.before.kind !== "milestone"
        ) {
          throw new Error(`Project deletion must delete owned Milestone: ${entityId}`);
        }
        break;
      case "issue": {
        if (
          current.value.context !== "workflow"
          || current.value.projectId !== project.value.id
          || effect.kind !== "replace-entity"
          || effect.before.kind !== "issue"
          || effect.after.kind !== "issue"
        ) {
          throw new Error(`Project deletion must move owned Workflow Issue: ${entityId}`);
        }
        const expectedAfter: TrailDomainEntity = {
          kind: "issue",
          value: { ...current.value, milestoneId: undefined, projectId: undefined },
        };
        if (!sameTrailDomainEntity(effect.after, expectedAfter)) {
          throw new Error(`Project deletion must preserve Issue facts while clearing Project scope: ${entityId}`);
        }
        const created = await createEntityOperations(effect.after, committed, repository);
        if (created.length !== 1) {
          throw new Error(`Project deletion Issue move must materialize one target operation: ${entityId}`);
        }
        const operation = created[0];
        if (
          operation === undefined
          || operation.kind !== "mutate-domain-source"
          || operation.mutation.kind !== "create"
          || operation.path === placement.path
        ) {
          throw new Error(`Project deletion Issue move must create a distinct target record: ${entityId}`);
        }
        targetOperations.push(operation);
        break;
      }
      case "initiative":
      case "cycle":
        throw new Error(`Project source owns unsupported entity kind during deletion: ${current.kind}`);
    }
  }

  const rootDelete = rootSourceDeleteOperation(project, committed);
  if (targetOperations.length === 0) {
    return {
      commandId: plan.commandId,
      intent: plan.intent,
      kind: "single",
      operations: [rootDelete],
    };
  }
  return {
    commandId: plan.commandId,
    intent: plan.intent,
    kind: "integrity-batch",
    stages: [
      { name: "prepare", operations: targetOperations },
      { name: "destructive", operations: [rootDelete] },
    ],
  };
}

async function tryCreateDeleteSourceTransition(
  plan: TrailMutationPlan,
  effects: readonly TrailStateEffect[],
  committed: TrailCommittedRuntime,
  repository: Pick<TrailDomainSourceRepository, "list">,
): Promise<TrailSourceTransitionPlan | undefined> {
  if (effects.length !== 2) return undefined;
  const create = effects.find((effect): effect is Extract<TrailStateEffect, { kind: "create-entity" }> => (
    effect.kind === "create-entity"
  ));
  const remove = effects.find((effect): effect is Extract<TrailStateEffect, { kind: "delete-entity" }> => (
    effect.kind === "delete-entity"
  ));
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

function requireValidWorkspace(
  authoritative: TrailAuthoritativeState,
  context: string,
): void {
  if (authoritative.configuration === null || authoritative.workspaceState === null) {
    throw new TrailIntegrityBatchMaterializationError(
      `Integrity Batch ${context} requires loaded Configuration and Workspace State`,
      [],
    );
  }
  const issues = validateTrailWorkspaceGraph({
    configuration: authoritative.configuration,
    domain: authoritative.domain,
    workspaceState: authoritative.workspaceState,
  });
  if (issues.length === 0) return;
  const first = issues[0];
  if (first === undefined) throw new Error("Integrity Batch validation issue disappeared");
  throw new TrailIntegrityBatchMaterializationError(
    `Integrity Batch ${context} is not safely stageable: ${first.code}: ${first.message}`,
    issues,
  );
}

/**
 * Mixed Plugin Data + Domain batches use one V1 bridge: Domain changes first,
 * Plugin Data cutover last. Every logical Domain prefix must stay valid under
 * the current Plugin Data so a failed prefix can be authoritatively reloaded.
 */
function assertPluginDataCommitBridge(
  committed: TrailCommittedRuntime,
  pluginDataOperation: Extract<TrailPersistenceOperation, { kind: "save-plugin-data" }>,
  orderedDomainEffects: readonly TrailStateEffect[],
): void {
  let staged: TrailAuthoritativeState = {
    ...committed.authoritative,
    configuration: pluginDataOperation.before.configuration,
    workspaceState: pluginDataOperation.before.workspaceState,
  };

  for (const effect of orderedDomainEffects) {
    staged = projectTrailAuthoritativeStateWithEffects(staged, [effect]);
    requireValidWorkspace(staged, "pre-commit Domain prefix");
  }

  requireValidWorkspace({
    ...staged,
    configuration: pluginDataOperation.after.configuration,
    workspaceState: pluginDataOperation.after.workspaceState,
  }, "final Plugin Data cutover");
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

  if (pluginData.operation === undefined) {
    const projectDelete = await tryMaterializeProjectDelete(
      plan,
      pluginData.remaining,
      committed,
      repository,
    );
    if (projectDelete !== undefined) return projectDelete;
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
  const prepareEffects: TrailStateEffect[] = [];
  const destructiveEffects: TrailStateEffect[] = [];

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
      prepareEffects.push(effect);
    } else if (effect.kind === "create-entity") {
      prepare.push(...await createEntityOperations(effect.after, committed, repository));
      prepareEffects.push(effect);
    } else if (effect.kind === "delete-entity") {
      destructive.push(...deleteEntityOperations(effect.before, committed, true));
      destructiveEffects.push(effect);
    }
  }

  if (pluginData.operation !== undefined) {
    if (pluginData.operation.kind !== "save-plugin-data") {
      throw new Error("Plugin Data materialization produced an unexpected operation");
    }
    assertPluginDataCommitBridge(
      committed,
      pluginData.operation,
      [...prepareEffects, ...destructiveEffects],
    );
  }

  return {
    commandId: plan.commandId,
    intent: plan.intent,
    kind: "integrity-batch",
    stages: [
      ...(prepare.length === 0 ? [] : [{ name: "prepare" as const, operations: prepare }]),
      ...(destructive.length === 0 ? [] : [{ name: "destructive" as const, operations: destructive }]),
      ...(pluginData.operation === undefined
        ? []
        : [{ name: "commit" as const, operations: [pluginData.operation] }]),
    ],
  };
}
