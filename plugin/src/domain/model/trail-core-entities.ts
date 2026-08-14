import type {
  TrailPriority,
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../trail-issue";
import type { TrailProject } from "../trail-project";

/** Compile-time Domain contract for Initiative while its product behavior remains deferred. */
export interface TrailInitiative {
  readonly description?: string;
  readonly due?: number;
  readonly id: string;
  readonly labelIds: readonly string[];
  readonly priority?: TrailPriority;
  readonly title: string;
}

/** Compile-time Domain contract for a Project-scoped Milestone checkpoint. */
export interface TrailMilestone {
  readonly description?: string;
  readonly due?: number;
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
}

/** Compile-time Domain contract for a user-opened planning Cycle. */
export interface TrailCycle {
  readonly endedAt?: number;
  readonly id: string;
  readonly issueIds: readonly string[];
  readonly plannedEnd: number;
  readonly startedAt: number;
}

export type TrailIssue = TrailTriageIssue | TrailWorkflowIssue;

export type TrailCoreEntity =
  | TrailInitiative
  | TrailProject
  | TrailMilestone
  | TrailIssue
  | TrailCycle;
