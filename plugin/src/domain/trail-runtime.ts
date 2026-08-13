import { createStore, type StoreApi } from "zustand/vanilla";

import type { TrailTriageIssue } from "./trail-issue";
import type {
  TrailTriageContribution,
  TrailTriageParseIssue,
} from "./trail-triage-markdown";
import type { CreateTriageIssuePlan } from "./trail-triage-command";

export type TrailRuntimeAvailability =
  | { readonly kind: "idle" }
  | { readonly kind: "initializing" }
  | { readonly kind: "ready"; readonly timezone: string }
  | { readonly kind: "blocked"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export interface TrailCommittedRuntime {
  readonly revision: number;
  readonly sourceByEntityId: Readonly<Record<string, string>>;
  readonly sourceIssues: readonly TrailTriageParseIssue[];
  readonly triageIssueIds: readonly string[];
  readonly triageIssuesById: Readonly<Record<string, TrailTriageIssue>>;
}

export interface TrailRuntimeState {
  readonly availability: TrailRuntimeAvailability;
  readonly committed: TrailCommittedRuntime;
  readonly pendingPlans: readonly CreateTriageIssuePlan[];
}

export type TrailRuntimeStore = StoreApi<TrailRuntimeState>;

function createEmptyCommittedRuntime(): TrailCommittedRuntime {
  return {
    revision: 0,
    sourceByEntityId: {},
    sourceIssues: [],
    triageIssueIds: [],
    triageIssuesById: {},
  };
}

export function createTrailRuntimeStore(): TrailRuntimeStore {
  return createStore<TrailRuntimeState>()(() => ({
    availability: { kind: "idle" },
    committed: createEmptyCommittedRuntime(),
    pendingPlans: [],
  }));
}

export function setTrailRuntimeAvailability(
  store: TrailRuntimeStore,
  availability: TrailRuntimeAvailability,
): void {
  store.setState((state) => ({
    availability,
    committed: state.committed,
    pendingPlans: state.pendingPlans,
  }));
}

function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length
    && left.every((value, index) => value === right[index])
  );
}

function sameTriageIssue(
  left: TrailTriageIssue,
  right: TrailTriageIssue,
): boolean {
  return (
    left.id === right.id
    && left.context === right.context
    && left.title === right.title
    && left.description === right.description
    && left.due === right.due
    && left.priority === right.priority
    && left.estimate === right.estimate
    && left.projectId === right.projectId
    && left.milestoneId === right.milestoneId
    && sameStringArray(left.labelIds, right.labelIds)
  );
}

function compareTriageIssues(
  left: TrailTriageIssue,
  right: TrailTriageIssue,
): number {
  if (left.due !== right.due) {
    return left.due - right.due;
  }
  return left.id.localeCompare(right.id);
}

function sortTriageIssueIds(
  issuesById: Readonly<Record<string, TrailTriageIssue>>,
): readonly string[] {
  return Object.values(issuesById)
    .slice()
    .sort(compareTriageIssues)
    .map((issue) => issue.id);
}

/**
 * Replaces the committed contribution from the authoritative Triage source while
 * retaining object identity for records whose canonical facts did not change.
 */
export function reconcileTriageContribution(
  store: TrailRuntimeStore,
  contribution: TrailTriageContribution,
): void {
  store.setState((state) => {
    const previous = state.committed.triageIssuesById;
    const triageIssuesById: Record<string, TrailTriageIssue> = {};
    const sourceByEntityId: Record<string, string> = {};

    for (const [id, incoming] of Object.entries(contribution.issuesById)) {
      const existing = previous[id];
      triageIssuesById[id] =
        existing !== undefined && sameTriageIssue(existing, incoming)
          ? existing
          : incoming;
      sourceByEntityId[id] = contribution.filePath;
    }

    return {
      availability: state.availability,
      committed: {
        revision: state.committed.revision + 1,
        sourceByEntityId,
        sourceIssues: [],
        triageIssueIds: sortTriageIssueIds(triageIssuesById),
        triageIssuesById,
      },
      pendingPlans: state.pendingPlans,
    };
  });
}

export function setTriageSourceIssues(
  store: TrailRuntimeStore,
  sourceIssues: readonly TrailTriageParseIssue[],
): void {
  store.setState((state) => ({
    availability: state.availability,
    committed: {
      ...state.committed,
      revision: state.committed.revision + 1,
      sourceIssues: [...sourceIssues],
    },
    pendingPlans: state.pendingPlans,
  }));
}

export function addPendingPlan(
  store: TrailRuntimeStore,
  plan: CreateTriageIssuePlan,
): void {
  store.setState((state) => ({
    availability: state.availability,
    committed: state.committed,
    pendingPlans: [...state.pendingPlans, plan],
  }));
}

export function removePendingPlan(
  store: TrailRuntimeStore,
  commandId: string,
): void {
  store.setState((state) => ({
    availability: state.availability,
    committed: state.committed,
    pendingPlans: state.pendingPlans.filter(
      (plan) => plan.commandId !== commandId,
    ),
  }));
}

export function selectEffectiveTriageIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailTriageIssue | undefined {
  for (let index = state.pendingPlans.length - 1; index >= 0; index -= 1) {
    const plan = state.pendingPlans[index];
    if (plan.issue.id === issueId) {
      return plan.issue;
    }
  }
  return state.committed.triageIssuesById[issueId];
}

/**
 * Effective Triage ordering is Due-first. Pending creates participate immediately
 * so every React view can observe the same optimistic projection.
 */
export function selectEffectiveTriageIssueIds(
  state: TrailRuntimeState,
): readonly string[] {
  const effective: Record<string, TrailTriageIssue> = {
    ...state.committed.triageIssuesById,
  };

  for (const plan of state.pendingPlans) {
    effective[plan.issue.id] = plan.issue;
  }

  return sortTriageIssueIds(effective);
}

export function selectEffectiveIssueIdSet(
  state: TrailRuntimeState,
): ReadonlySet<string> {
  return new Set(selectEffectiveTriageIssueIds(state));
}

export function selectIsTriageIssuePending(
  state: TrailRuntimeState,
  issueId: string,
): boolean {
  return state.pendingPlans.some((plan) => plan.issue.id === issueId);
}
