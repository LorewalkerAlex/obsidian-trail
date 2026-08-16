import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import {
  sameTrailConfiguration,
  sameTrailDomainEntity,
  sameTrailWorkspaceState,
} from "../../domain/rules/trail-domain-equality";
import type { TrailDomainSourceSnapshot } from "../../persistence/domain-sources/trail-domain-source-snapshot";
import type { TrailDomainSourceReadResult } from "../../persistence/domain-sources/trail-source-result";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type {
  TrailPluginDataReadResult,
  TrailPluginDataRepository,
} from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import type {
  TrailPersistenceOperation,
  TrailPersistenceTransactionPlan,
} from "../physical/trail-persistence-transaction-plan";

export type TrailPersistenceOperationResult =
  | {
      readonly change:
        | { readonly kind: "created" }
        | { readonly kind: "mutated" }
        | { readonly from: string; readonly kind: "renamed" };
      readonly kind: "domain-source";
      readonly result: Extract<TrailDomainSourceReadResult, { kind: "accepted" }>;
    }
  | { readonly kind: "domain-source-deleted"; readonly sourcePath: string }
  | { readonly kind: "plugin-data"; readonly snapshot: TrailPluginDataSnapshot };

interface TrailPersistenceExecutionResultBase {
  readonly commandId: string;
  /** Results in physical execution order; useful for diagnostics and audit evidence. */
  readonly operations: readonly TrailPersistenceOperationResult[];
}

export type TrailPersistenceExecutionResult =
  | (TrailPersistenceExecutionResultBase & { readonly topology: "single" })
  | (TrailPersistenceExecutionResultBase & {
      readonly sourceOperations: readonly TrailPersistenceOperationResult[];
      readonly sourceRecovered: boolean;
      readonly targetOperations: readonly TrailPersistenceOperationResult[];
      readonly topology: "source-transition";
    })
  | (TrailPersistenceExecutionResultBase & { readonly topology: "integrity-batch" });

export interface TrailPersistenceExecutionEnvironment {
  readonly domainSources: TrailDomainSourceRepository;
  readonly pluginData: TrailPluginDataRepository;
}

export class TrailPersistenceOperationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TrailPersistenceOperationError";
  }
}

export class TrailSourceTransitionExecutionError extends Error {
  public constructor(
    message: string,
    readonly compensationSucceeded: boolean,
    readonly cause: unknown,
    readonly compensationError?: unknown,
  ) {
    super(message);
    this.name = "TrailSourceTransitionExecutionError";
  }
}

function requireAccepted(
  result: TrailDomainSourceReadResult,
  operation: TrailPersistenceOperation,
): Extract<TrailDomainSourceReadResult, { kind: "accepted" }> {
  if (result.kind === "rejected") {
    throw new TrailPersistenceOperationError(
      `Authoritative reread rejected after ${operation.kind}: ${result.sourcePath}`,
    );
  }
  if (result.issues.length > 0) {
    throw new TrailPersistenceOperationError(
      `Authoritative reread reported source issues after ${operation.kind}: ${result.snapshot.sourcePath}`,
    );
  }
  return result;
}

function assertPluginDataBefore(
  read: TrailPluginDataReadResult,
  expected: TrailPluginDataSnapshot,
): void {
  if (
    read.kind !== "valid"
    || !sameTrailConfiguration(read.snapshot.configuration, expected.configuration)
    || !sameTrailWorkspaceState(read.snapshot.workspaceState, expected.workspaceState)
  ) {
    throw new TrailPersistenceOperationError("Plugin Data changed after logical planning");
  }
}

async function executeOperation(
  operation: TrailPersistenceOperation,
  environment: TrailPersistenceExecutionEnvironment,
): Promise<TrailPersistenceOperationResult> {
  switch (operation.kind) {
    case "create-domain-source": {
      const result = await environment.domainSources.createSource(operation.source);
      return { change: { kind: "created" }, kind: "domain-source", result: requireAccepted(result, operation) };
    }
    case "mutate-domain-source": {
      const result = await environment.domainSources.mutate(
        operation.sourceKind,
        operation.path,
        operation.mutation,
        operation.options,
      );
      return { change: { kind: "mutated" }, kind: "domain-source", result: requireAccepted(result, operation) };
    }
    case "rename-domain-source": {
      const result = await environment.domainSources.renameSource(
        operation.sourceKind,
        operation.from,
        operation.to,
      );
      return { change: { from: operation.from, kind: "renamed" }, kind: "domain-source", result: requireAccepted(result, operation) };
    }
    case "delete-domain-source":
      await environment.domainSources.deleteSource(operation.path);
      return { kind: "domain-source-deleted", sourcePath: operation.path };
    case "save-plugin-data": {
      const current = await environment.pluginData.read();
      assertPluginDataBefore(current, operation.before);
      return {
        kind: "plugin-data",
        snapshot: await environment.pluginData.save(operation.after),
      };
    }
  }
}

function entitiesInSourceSnapshot(snapshot: TrailDomainSourceSnapshot): readonly TrailDomainEntity[] {
  switch (snapshot.kind) {
    case "initiative":
      return [{ kind: "initiative", value: snapshot.initiative }];
    case "project":
      return [
        { kind: "project", value: snapshot.project },
        ...snapshot.milestones.map((value) => ({ kind: "milestone" as const, value })),
        ...snapshot.issues.map((value) => ({ kind: "issue" as const, value })),
      ];
    case "triage":
    case "projectless-issues":
      return snapshot.issues.map((value) => ({ kind: "issue" as const, value }));
    case "cycles":
      return snapshot.cycles.map((value) => ({ kind: "cycle" as const, value }));
  }
}

type TrailSourceFailureObservation =
  | { readonly kind: "ambiguous" }
  | { readonly kind: "committed"; readonly result: TrailPersistenceOperationResult }
  | { readonly kind: "unchanged" };

function sameTrailDomainSourceSnapshot(
  left: TrailDomainSourceSnapshot,
  right: TrailDomainSourceSnapshot,
): boolean {
  if (left.kind !== right.kind || left.sourcePath !== right.sourcePath) return false;
  const leftEntities = entitiesInSourceSnapshot(left);
  const rightEntities = entitiesInSourceSnapshot(right);
  return leftEntities.length === rightEntities.length
    && leftEntities.every((entity, index) => {
      const candidate = rightEntities[index];
      return candidate !== undefined && sameTrailDomainEntity(entity, candidate);
    });
}

/**
 * A newly created file target may be deleted as compensation only while a clean
 * latest reread still matches the target snapshot that Trail just verified.
 */
async function canSafelyRunTargetCompensation(
  targetOperations: readonly TrailPersistenceOperation[],
  targetResults: readonly TrailPersistenceOperationResult[],
  compensation: readonly TrailPersistenceOperation[],
  environment: TrailPersistenceExecutionEnvironment,
): Promise<boolean> {
  const fileDeletes = compensation.filter((operation) => operation.kind === "delete-domain-source");
  if (fileDeletes.length === 0) return true;
  if (
    fileDeletes.length !== 1
    || compensation.length !== 1
    || targetOperations.length !== 1
    || targetResults.length !== 1
  ) {
    return false;
  }

  const target = targetOperations[0];
  const result = targetResults[0];
  const deletion = fileDeletes[0];
  if (
    target === undefined
    || target.kind !== "create-domain-source"
    || result === undefined
    || result.kind !== "domain-source"
    || deletion === undefined
    || deletion.path !== target.source.path
  ) {
    return false;
  }

  try {
    const latest = await environment.domainSources.read(target.source.kind, target.source.path);
    return latest.kind === "accepted"
      && latest.issues.length === 0
      && sameTrailDomainSourceSnapshot(latest.snapshot, result.result.snapshot);
  } catch {
    return false;
  }
}

/**
 * Compensation is safe only when a clean authoritative reread proves the source
 * still equals the destructive operation's pre-image. If the intended delete is
 * already visible, the source step is recovered instead of rolling back target.
 */
async function observeFailedSourceStage(
  operations: readonly TrailPersistenceOperation[],
  environment: TrailPersistenceExecutionEnvironment,
): Promise<TrailSourceFailureObservation> {
  if (operations.length !== 1) return { kind: "ambiguous" };
  const operation = operations[0];
  if (
    operation === undefined
    || operation.kind !== "mutate-domain-source"
    || operation.mutation.kind !== "delete"
  ) {
    return { kind: "ambiguous" };
  }

  let reread: TrailDomainSourceReadResult;
  try {
    reread = await environment.domainSources.read(operation.sourceKind, operation.path);
  } catch {
    return { kind: "ambiguous" };
  }
  if (reread.kind !== "accepted" || reread.issues.length > 0) {
    return { kind: "ambiguous" };
  }

  const expected = operation.mutation.before;
  const matches = entitiesInSourceSnapshot(reread.snapshot).filter((entity) => (
    entity.value.id === expected.value.id
  ));
  if (matches.length === 0) {
    return {
      kind: "committed",
      result: {
        change: { kind: "mutated" },
        kind: "domain-source",
        result: reread,
      },
    };
  }
  if (matches.length === 1 && sameTrailDomainEntity(matches[0], expected)) {
    return { kind: "unchanged" };
  }
  return { kind: "ambiguous" };
}

async function executeOperations(
  operations: readonly TrailPersistenceOperation[],
  environment: TrailPersistenceExecutionEnvironment,
): Promise<readonly TrailPersistenceOperationResult[]> {
  const results: TrailPersistenceOperationResult[] = [];
  for (const operation of operations) results.push(await executeOperation(operation, environment));
  return results;
}

function assertExecutableTopology(plan: TrailPersistenceTransactionPlan): void {
  switch (plan.kind) {
    case "single":
      if (plan.operations.length === 0) {
        throw new TrailPersistenceOperationError("Single Transaction requires at least one operation");
      }
      return;
    case "source-transition":
      if (plan.target.length === 0 || plan.source.length === 0 || plan.compensation.length === 0) {
        throw new TrailPersistenceOperationError(
          "Source Transition requires target, source, and compensation operations",
        );
      }
      return;
    case "integrity-batch":
      if (plan.stages.length === 0 || plan.stages.some((stage) => stage.operations.length === 0)) {
        throw new TrailPersistenceOperationError(
          "Integrity Batch requires non-empty execution stages",
        );
      }
  }
}

/** Executes one of the three fixed persistence topologies; verification stays inside repository operations. */
export async function executeTrailPersistenceTransaction(
  plan: TrailPersistenceTransactionPlan,
  environment: TrailPersistenceExecutionEnvironment,
): Promise<TrailPersistenceExecutionResult> {
  assertExecutableTopology(plan);

  switch (plan.kind) {
    case "single":
      return {
        commandId: plan.commandId,
        operations: await executeOperations(plan.operations, environment),
        topology: plan.kind,
      };
    case "source-transition": {
      const targetResults = await executeOperations(plan.target, environment);
      try {
        const sourceResults = await executeOperations(plan.source, environment);
        return {
          commandId: plan.commandId,
          operations: [...targetResults, ...sourceResults],
          sourceOperations: sourceResults,
          sourceRecovered: false,
          targetOperations: targetResults,
          topology: plan.kind,
        };
      } catch (error: unknown) {
        const observation = await observeFailedSourceStage(plan.source, environment);
        if (observation.kind === "committed") {
          return {
            commandId: plan.commandId,
            operations: [...targetResults, observation.result],
            sourceOperations: [observation.result],
            sourceRecovered: true,
            targetOperations: targetResults,
            topology: plan.kind,
          };
        }
        if (observation.kind === "ambiguous") {
          throw new TrailSourceTransitionExecutionError(
            "Source Transition source step failed; safe target compensation could not be proven",
            false,
            error,
          );
        }
        if (!await canSafelyRunTargetCompensation(
          plan.target,
          targetResults,
          plan.compensation,
          environment,
        )) {
          throw new TrailSourceTransitionExecutionError(
            "Source Transition source step failed; target changed before safe compensation",
            false,
            error,
          );
        }

        try {
          await executeOperations(plan.compensation, environment);
          throw new TrailSourceTransitionExecutionError(
            "Source Transition source step failed; target compensation succeeded",
            true,
            error,
          );
        } catch (compensationError: unknown) {
          if (
            compensationError instanceof TrailSourceTransitionExecutionError
            && compensationError.compensationSucceeded
          ) {
            throw compensationError;
          }
          throw new TrailSourceTransitionExecutionError(
            "Source Transition source step failed and target compensation also failed",
            false,
            error,
            compensationError,
          );
        }
      }
    }
    case "integrity-batch": {
      const results: TrailPersistenceOperationResult[] = [];
      for (const stage of plan.stages) {
        results.push(...await executeOperations(stage.operations, environment));
      }
      return { commandId: plan.commandId, operations: results, topology: plan.kind };
    }
  }
}
