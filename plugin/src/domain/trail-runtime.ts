import { createStore, type StoreApi } from "zustand/vanilla";

import {
  sameTrailStringArray,
  sameTrailTriageIssue,
  type TrailTriageIssue,
} from "./trail-issue";
import type {
  TrailTriageContribution,
  TrailTriageParseIssue,
} from "./trail-triage-markdown";
import {
  affectedTriageIssueId,
  type TriageMutationPlan,
} from "./trail-triage-plan";

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
  readonly pendingPlans: readonly TriageMutationPlan[];
}

export type TrailRuntimeStore = StoreApi<TrailRuntimeState>;

export type TriageDiagnosticField =
  | "context"
  | "description"
  | "due"
  | "estimate"
  | "labelIds"
  | "milestoneId"
  | "priority"
  | "projectId"
  | "title";

export interface TriageReconcileDiff {
  readonly addedIds: readonly string[];
  readonly changedFieldsById: Readonly<Record<
    string,
    readonly TriageDiagnosticField[]
  >>;
  readonly changedIds: readonly string[];
  readonly removedIds: readonly string[];
}

export interface TriageReconcileResult {
  readonly diff: TriageReconcileDiff;
  readonly revision: number;
  readonly triageCount: number;
}

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

function changedTriageFields(
  previous: TrailTriageIssue,
  next: TrailTriageIssue,
): readonly TriageDiagnosticField[] {
  const changed: TriageDiagnosticField[] = [];

  if (previous.context !== next.context) changed.push("context");
  if (previous.description !== next.description) changed.push("description");
  if (previous.due !== next.due) changed.push("due");
  if (previous.estimate !== next.estimate) changed.push("estimate");
  if (!sameTrailStringArray(previous.labelIds, next.labelIds)) changed.push("labelIds");
  if (previous.milestoneId !== next.milestoneId) changed.push("milestoneId");
  if (previous.priority !== next.priority) changed.push("priority");
  if (previous.projectId !== next.projectId) changed.push("projectId");
  if (previous.title !== next.title) changed.push("title");

  return changed;
}

function buildTriageReconcileDiff(
  previous: Readonly<Record<string, TrailTriageIssue>>,
  next: Readonly<Record<string, TrailTriageIssue>>,
): TriageReconcileDiff {
  const previousIds = new Set(Object.keys(previous));
  const nextIds = new Set(Object.keys(next));
  const addedIds = [...nextIds].filter((id) => !previousIds.has(id)).sort();
  const removedIds = [...previousIds].filter((id) => !nextIds.has(id)).sort();
  const changedFieldsById: Record<string, readonly TriageDiagnosticField[]> = {};

  for (const id of [...nextIds].filter((value) => previousIds.has(value)).sort()) {
    const previousIssue = previous[id];
    const nextIssue = next[id];
    if (previousIssue === undefined || nextIssue === undefined) {
      continue;
    }
    const changedFields = changedTriageFields(previousIssue, nextIssue);
    if (changedFields.length > 0) {
      changedFieldsById[id] = changedFields;
    }
  }

  return {
    addedIds,
    changedFieldsById,
    changedIds: Object.keys(changedFieldsById).sort(),
    removedIds,
  };
}

/**
 * Replaces the committed contribution from the authoritative Triage source while
 * retaining object identity for records whose canonical facts did not change.
 */
export function reconcileTriageContribution(
  store: TrailRuntimeStore,
  contribution: TrailTriageContribution,
): TriageReconcileResult {
  const previous = store.getState().committed.triageIssuesById;
  const diff = buildTriageReconcileDiff(previous, contribution.issuesById);
  let revision = store.getState().committed.revision;
  let triageCount = 0;

  store.setState((state) => {
    const triageIssuesById: Record<string, TrailTriageIssue> = {};
    const sourceByEntityId: Record<string, string> = {};

    for (const [id, incoming] of Object.entries(contribution.issuesById)) {
      const existing = state.committed.triageIssuesById[id];
      triageIssuesById[id] =
        existing !== undefined && sameTrailTriageIssue(existing, incoming)
          ? existing
          : incoming;
      sourceByEntityId[id] = contribution.filePath;
    }

    const triageIssueIds = sortTriageIssueIds(triageIssuesById);
    revision = state.committed.revision + 1;
    triageCount = triageIssueIds.length;

    return {
      availability: state.availability,
      committed: {
        revision,
        sourceByEntityId,
        sourceIssues: [],
        triageIssueIds,
        triageIssuesById,
      },
      pendingPlans: state.pendingPlans,
    };
  });

  return { diff, revision, triageCount };
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
  plan: TriageMutationPlan,
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

function applyPendingPlan(
  effective: Record<string, TrailTriageIssue>,
  plan: TriageMutationPlan,
): void {
  switch (plan.kind) {
    case "create-triage-issue":
    case "update-triage-issue":
      effective[plan.issue.id] = plan.issue;
      break;
    case "delete-triage-issue":
      delete effective[plan.issueId];
      break;
  }
}

function effectiveTriageIssuesById(
  state: TrailRuntimeState,
): Record<string, TrailTriageIssue> {
  const effective: Record<string, TrailTriageIssue> = {
    ...state.committed.triageIssuesById,
  };
  for (const plan of state.pendingPlans) {
    applyPendingPlan(effective, plan);
  }
  return effective;
}

export function selectEffectiveTriageIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailTriageIssue | undefined {
  return effectiveTriageIssuesById(state)[issueId];
}

/**
 * Effective Triage ordering is Due-first. Every pending plan participates so all
 * React surfaces observe the same optimistic projection.
 */
export function selectEffectiveTriageIssueIds(
  state: TrailRuntimeState,
): readonly string[] {
  return sortTriageIssueIds(effectiveTriageIssuesById(state));
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
  return state.pendingPlans.some(
    (plan) => affectedTriageIssueId(plan) === issueId,
  );
}
