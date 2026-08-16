import {
  sameTrailConfiguration,
  sameTrailWorkspaceState,
} from "../../domain/rules/trail-domain-equality";
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

export interface TrailPersistenceExecutionResult {
  readonly commandId: string;
  readonly operations: readonly TrailPersistenceOperationResult[];
  readonly topology: TrailPersistenceTransactionPlan["kind"];
}

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
          topology: plan.kind,
        };
      } catch (error: unknown) {
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
