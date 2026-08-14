import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import type { TrailSingleTransactionPlan } from "../physical/trail-single-transaction-plan";

export interface TrailProjectCreateAtPathPersistence<TResult> {
  readonly createProjectAtPath: (
    filePath: string,
    project: TrailProject,
    correlationId?: string,
  ) => Promise<TResult>;
}

export interface TrailTriageCreatePersistence<TResult> {
  readonly appendIssue: (
    issue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TResult>;
}

export interface TrailTriageManagePersistence<TResult> {
  readonly deleteIssue: (
    expectedIssue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TResult>;
  readonly updateIssue: (
    expectedIssue: TrailTriageIssue,
    issue: TrailTriageIssue,
    correlationId?: string,
  ) => Promise<TResult>;
}

export interface TrailWorkflowMutationPersistence<TResult> {
  readonly appendIssue: (
    filePath: string,
    expectedProject: TrailProject,
    issue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TResult>;
  readonly deleteIssue?: (
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TResult>;
  readonly updateIssue: (
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
    issue: TrailWorkflowIssue,
    correlationId?: string,
  ) => Promise<TResult>;
}

/** Persistence capabilities are opaque to execution; source parsing stays below this boundary. */
export interface TrailSingleTransactionPersistence<TResult> {
  readonly projectCreate?: TrailProjectCreateAtPathPersistence<TResult>;
  readonly triageCreate?: TrailTriageCreatePersistence<TResult>;
  readonly triageManage?: TrailTriageManagePersistence<TResult>;
  readonly workflow?: TrailWorkflowMutationPersistence<TResult>;
}

export type TrailSingleTransactionResult<TResult> =
  | { readonly kind: "project-source"; readonly result: TResult }
  | { readonly kind: "triage-source"; readonly result: TResult };

function missingCapability(capability: string): never {
  throw new Error(`Single transaction persistence capability is unavailable: ${capability}`);
}

/** Executes one already-materialized authoritative source operation. */
export async function executeTrailSingleTransaction<TResult>(
  plan: TrailSingleTransactionPlan,
  persistence: TrailSingleTransactionPersistence<TResult>,
  correlationId?: string,
): Promise<TrailSingleTransactionResult<TResult>> {
  switch (plan.operation.kind) {
    case "project-create": {
      const target = persistence.projectCreate ?? missingCapability("project-create");
      return {
        kind: "project-source",
        result: await target.createProjectAtPath(
          plan.sourcePath,
          plan.operation.project,
          correlationId,
        ),
      };
    }
    case "triage-create": {
      const target = persistence.triageCreate ?? missingCapability("triage-create");
      return {
        kind: "triage-source",
        result: await target.appendIssue(plan.operation.issue, correlationId),
      };
    }
    case "triage-replace": {
      const target = persistence.triageManage ?? missingCapability("triage-replace");
      return {
        kind: "triage-source",
        result: await target.updateIssue(
          plan.operation.expectedIssue,
          plan.operation.issue,
          correlationId,
        ),
      };
    }
    case "triage-delete": {
      const target = persistence.triageManage ?? missingCapability("triage-delete");
      return {
        kind: "triage-source",
        result: await target.deleteIssue(plan.operation.expectedIssue, correlationId),
      };
    }
    case "workflow-create": {
      const target = persistence.workflow ?? missingCapability("workflow-create");
      return {
        kind: "project-source",
        result: await target.appendIssue(
          plan.sourcePath,
          plan.operation.expectedProject,
          plan.operation.issue,
          correlationId,
        ),
      };
    }
    case "workflow-replace": {
      const target = persistence.workflow ?? missingCapability("workflow-replace");
      return {
        kind: "project-source",
        result: await target.updateIssue(
          plan.sourcePath,
          plan.operation.expectedIssue,
          plan.operation.issue,
          correlationId,
        ),
      };
    }
    case "workflow-delete": {
      const target = persistence.workflow;
      if (target?.deleteIssue === undefined) missingCapability("workflow-delete");
      return {
        kind: "project-source",
        result: await target.deleteIssue(
          plan.sourcePath,
          plan.operation.expectedIssue,
          correlationId,
        ),
      };
    }
  }
}
