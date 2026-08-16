import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../domain/trail-issue";
import type { TriageAcceptReceipt } from "./triage/trail-triage-accept";
import type { TriageCaptureReceipt } from "./triage/trail-triage-intake";
import type { TriageManagementReceipt } from "./triage/trail-triage-management";

/** Receipt returned by Application actions that optimistically mutate one entity. */
export interface TrailEntityMutationReceipt {
  readonly completion: Promise<void>;
  readonly entityId: string;
}

/** Narrow UI-facing action surface; host refresh and persistence are intentionally absent. */
export interface TrailApplicationActions {
  readonly acceptTriageIssue: (
    expectedIssue: TrailTriageIssue,
    projectId: string,
  ) => TriageAcceptReceipt;
  readonly capture: (title: string) => TriageCaptureReceipt;
  readonly changeWorkflowIssueStatus: (
    expectedIssue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
    estimate?: number,
  ) => TrailEntityMutationReceipt;
  readonly createProject: (title: string) => TrailEntityMutationReceipt;
  readonly createWorkflowIssue: (
    projectId: string,
    title: string,
  ) => TrailEntityMutationReceipt;
  readonly deferTriageIssue: (
    expectedIssue: TrailTriageIssue,
  ) => TriageManagementReceipt;
  readonly deleteTriageIssue: (
    expectedIssue: TrailTriageIssue,
  ) => TriageManagementReceipt;
  readonly editTriageIssue: (
    expectedIssue: TrailTriageIssue,
    title: string,
    dueLocalValue: string,
  ) => TriageManagementReceipt;
}