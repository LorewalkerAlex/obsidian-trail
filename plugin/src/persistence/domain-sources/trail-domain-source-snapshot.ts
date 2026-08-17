import type {
  TrailCycle,
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";

export interface TrailInitiativeSourceSnapshot {
  readonly initiative: TrailInitiative;
  readonly kind: "initiative";
  readonly sourcePath: string;
}

export interface TrailProjectSourceSnapshot {
  readonly issues: readonly TrailWorkflowIssue[];
  readonly kind: "project";
  readonly milestones: readonly TrailMilestone[];
  readonly project: TrailProject;
  readonly sourcePath: string;
}

export interface TrailTriageSourceSnapshot {
  readonly issues: readonly TrailTriageIssue[];
  readonly kind: "triage";
  readonly sourcePath: string;
}

export interface TrailProjectlessIssuesSourceSnapshot {
  readonly issues: readonly TrailWorkflowIssue[];
  readonly kind: "projectless-issues";
  readonly sourcePath: string;
}

export interface TrailCyclesSourceSnapshot {
  readonly cycles: readonly TrailCycle[];
  readonly kind: "cycles";
  readonly sourcePath: string;
}

/** Runtime-facing authoritative source contribution with parser ranges removed. */
export type TrailDomainSourceSnapshot =
  | TrailInitiativeSourceSnapshot
  | TrailProjectSourceSnapshot
  | TrailTriageSourceSnapshot
  | TrailProjectlessIssuesSourceSnapshot
  | TrailCyclesSourceSnapshot;
