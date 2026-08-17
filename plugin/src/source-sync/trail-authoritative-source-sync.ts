import {
  sameTrailConfiguration,
  sameTrailDomainEntity,
  sameTrailWorkspaceState,
} from "../domain/rules/trail-domain-equality";
import { validateTrailWorkspaceGraph } from "../domain/validation/trail-workspace-validation";
import { submitTrailMutation } from "../mutation/coordinator/trail-mutation-coordinator";
import {
  executeTrailPersistenceTransaction,
  type TrailPersistenceExecutionResult,
  type TrailPersistenceOperationResult,
} from "../mutation/execution/trail-persistence-transaction-executor";
import type {
  TrailPersistenceOperation,
  TrailPersistenceTransactionPlan,
} from "../mutation/physical/trail-persistence-transaction-plan";
import { materializeTrailPersistenceTransactionPlan } from "../mutation/physical/trail-transaction-materializer";
import type { TrailMutationPlan, TrailPostcondition } from "../mutation/plans/trail-mutation-plan";
import type { TrailMutationQueue } from "../mutation/queue/trail-mutation-queue";
import type { TrailDomainSourceRepository } from "../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataRepository } from "../persistence/plugin-data/trail-plugin-data-repository";
import {
  buildTrailRuntimeCandidateAfterChanges,
  publishTrailCommittedRuntime,
  type TrailRuntimeAuthoritativeChange,
} from "../runtime/reconcile/trail-runtime-reconciler";
import {
  findTrailDomainEntity,
  type TrailRuntimeStore,
} from "../runtime/store/trail-runtime-store";
import type { TrailRefreshRecovery } from "./refresh/trail-refresh-controller";

export interface TrailAuthoritativeSourceSync {
  readonly submit: (plan: TrailMutationPlan) => Promise<TrailPersistenceExecutionResult>;
}

function operationHealthPaths(operation: TrailPersistenceOperation): readonly string[] {
  switch (operation.kind) {
    case "create-domain-source":
    case "save-plugin-data":
      return [];
    case "mutate-domain-source":
    case "delete-domain-source":
      return [operation.path];
    case "rename-domain-source":
      return [operation.from];
  }
}

function planHealthPaths(plan: TrailPersistenceTransactionPlan): readonly string[] {
  const operations: TrailPersistenceOperation[] = [];
  switch (plan.kind) {
    case "single":
      operations.push(...plan.operations);
      break;
    case "source-transition":
      operations.push(...plan.target, ...plan.source);
      break;
    case "integrity-batch":
      for (const stage of plan.stages) operations.push(...stage.operations);
      break;
  }
  return [...new Set(operations.flatMap(operationHealthPaths))].sort();
}

function assertHealthyPhysicalSources(
  store: TrailRuntimeStore,
  plan: TrailPersistenceTransactionPlan,
): void {
  const sourceIssues = store.getState().health.sourceIssuesByPath;
  const blocked = planHealthPaths(plan).filter((path) => (sourceIssues[path]?.length ?? 0) > 0);
  if (blocked.length > 0) {
    throw new Error(`Mutation touches unhealthy managed source(s): ${blocked.join(", ")}`);
  }
}

function settlementOperationResults(
  result: TrailPersistenceExecutionResult,
): readonly TrailPersistenceOperationResult[] {
  if (result.topology === "source-transition") {
    // Physical durability is target-first, but after both sides succeed the final
    // in-memory candidate must release old ownership before accepting the target.
    return [...result.sourceOperations, ...result.targetOperations];
  }
  if (result.topology === "integrity-batch") {
    const sourceDeletes = result.operations.filter(({ kind }) => kind === "domain-source-deleted");
    if (sourceDeletes.length === 0) return result.operations;

    // Integrity Batch may prepare a replacement carrier before deleting the old
    // file that owned the same entity IDs. Candidate replay removes old source
    // ownership first while retaining the executor's physical audit order.
    return [
      ...sourceDeletes,
      ...result.operations.filter(({ kind }) => kind !== "domain-source-deleted"),
    ];
  }
  return result.operations;
}

export function runtimeChangesFromPersistenceResult(
  result: TrailPersistenceExecutionResult,
): readonly TrailRuntimeAuthoritativeChange[] {
  const changes: TrailRuntimeAuthoritativeChange[] = [];
  for (const operation of settlementOperationResults(result)) {
    switch (operation.kind) {
      case "domain-source":
        if (operation.change.kind === "renamed") {
          changes.push({ kind: "remove-domain-source", sourcePath: operation.change.from });
        }
        changes.push({
          issues: operation.result.issues,
          kind: "replace-domain-source",
          snapshot: operation.result.snapshot,
        });
        break;
      case "domain-source-deleted":
        changes.push({ kind: "remove-domain-source", sourcePath: operation.sourcePath });
        break;
      case "plugin-data":
        changes.push({ kind: "replace-plugin-data", snapshot: operation.snapshot });
        break;
    }
  }
  return changes;
}

function assertPostcondition(
  candidate: ReturnType<typeof buildTrailRuntimeCandidateAfterChanges>["committed"]["authoritative"],
  condition: TrailPostcondition,
): void {
  switch (condition.kind) {
    case "entity-absent":
      if (findTrailDomainEntity(candidate.domain, condition.entityId) !== undefined) {
        throw new Error(`Mutation postcondition failed: entity must be absent: ${condition.entityId}`);
      }
      return;
    case "entity-equals": {
      const actual = findTrailDomainEntity(candidate.domain, condition.entity.value.id);
      if (actual === undefined || !sameTrailDomainEntity(actual, condition.entity)) {
        throw new Error(`Mutation postcondition failed: entity mismatch: ${condition.entity.value.id}`);
      }
      return;
    }
    case "configuration-equals":
      if (
        candidate.configuration === null
        || !sameTrailConfiguration(candidate.configuration, condition.configuration)
      ) {
        throw new Error("Mutation postcondition failed: Configuration mismatch");
      }
      return;
    case "workspace-state-equals":
      if (
        candidate.workspaceState === null
        || !sameTrailWorkspaceState(candidate.workspaceState, condition.workspaceState)
      ) {
        throw new Error("Mutation postcondition failed: Workspace State mismatch");
      }
  }
}

/** Bridges logical Mutation to verified authoritative Runtime without Feature-specific source syncs. */
export function createTrailAuthoritativeSourceSync(input: {
  readonly domainSources: TrailDomainSourceRepository;
  readonly mutationQueue: TrailMutationQueue;
  readonly pluginData: TrailPluginDataRepository;
  readonly refresh: TrailRefreshRecovery;
  readonly runtimeStore: TrailRuntimeStore;
}): TrailAuthoritativeSourceSync {
  return {
    submit(plan): Promise<TrailPersistenceExecutionResult> {
      return submitTrailMutation(
        input.runtimeStore,
        input.mutationQueue,
        plan,
        {
          async execute(physical) {
            assertHealthyPhysicalSources(input.runtimeStore, physical);
            return executeTrailPersistenceTransaction(physical, {
              domainSources: input.domainSources,
              pluginData: input.pluginData,
            });
          },
          materialize: (logical, committed) =>
            materializeTrailPersistenceTransactionPlan(
              logical,
              committed,
              input.domainSources,
            ),
          recover: (error) => input.refresh.recoverFromMutationFailure(error),
          async settle(result) {
            const current = input.runtimeStore.getState();
            const candidate = buildTrailRuntimeCandidateAfterChanges({
              changes: runtimeChangesFromPersistenceResult(result),
              committed: current.committed,
              health: current.health,
            });
            const configuration = candidate.committed.authoritative.configuration;
            const workspaceState = candidate.committed.authoritative.workspaceState;
            if (configuration === null || workspaceState === null) {
              throw new Error("Mutation settlement requires loaded Configuration and Workspace State");
            }
            const workspaceIssues = validateTrailWorkspaceGraph({
              configuration,
              domain: candidate.committed.authoritative.domain,
              workspaceState,
            });
            if (workspaceIssues.length > 0) {
              throw new Error(
                `Mutation produced an invalid authoritative workspace: ${workspaceIssues.map(({ message }) => message).join("; ")}`,
              );
            }
            for (const condition of plan.postconditions) {
              assertPostcondition(candidate.committed.authoritative, condition);
            }
            publishTrailCommittedRuntime(
              input.runtimeStore,
              candidate.committed,
              candidate.health,
            );
          },
        },
      );
    },
  };
}
