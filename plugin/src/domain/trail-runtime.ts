import { createStore, type StoreApi } from "zustand/vanilla";

import type { TrailConfiguration } from "./trail-configuration";
import {
  sameTrailStringArray,
  sameTrailTriageIssue,
  sameTrailWorkflowIssue,
  type TrailTriageIssue,
  type TrailWorkflowIssue,
} from "./trail-issue";
import { sameTrailProject, type TrailProject } from "./trail-project";
import type { TrailProjectContribution } from "./trail-project-markdown";
import type { TrailSourceIssue } from "./trail-source-issue";

// React external-store selectors must reuse one empty snapshot instead of allocating per read.
const EMPTY_SOURCE_ISSUES: readonly TrailSourceIssue[] = Object.freeze([]);
import type {
  TrailTriageContribution,
  TrailTriageParseIssue,
} from "./trail-triage-markdown";
import {
  affectedTriageIssueId,
  type TriageMutationPlan,
} from "./trail-triage-plan";
import {
  affectedWorkflowEntityId,
  type WorkflowMutationPlan,
} from "./trail-workflow-plan";

export type TrailRuntimeAvailability =
  | { readonly kind: "idle" }
  | { readonly kind: "initializing" }
  | { readonly kind: "ready"; readonly timezone: string }
  | { readonly kind: "blocked"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export type TrailPendingPlan = TriageMutationPlan | WorkflowMutationPlan;

export interface TrailCommittedRuntime {
  readonly configuration: TrailConfiguration | null;
  readonly issuesByProjectId: Readonly<Record<string, readonly string[]>>;
  readonly projectIds: readonly string[];
  readonly projectsById: Readonly<Record<string, TrailProject>>;
  readonly revision: number;
  readonly sourceByEntityId: Readonly<Record<string, string>>;
  readonly sourceEntityIdsByPath: Readonly<Record<string, readonly string[]>>;
  readonly sourceIssues: readonly TrailSourceIssue[];
  readonly sourceIssuesByPath: Readonly<Record<string, readonly TrailSourceIssue[]>>;
  readonly triageIssueIds: readonly string[];
  readonly triageIssuesById: Readonly<Record<string, TrailTriageIssue>>;
  readonly workflowIssuesById: Readonly<Record<string, TrailWorkflowIssue>>;
}

export interface TrailRuntimeState {
  readonly availability: TrailRuntimeAvailability;
  readonly committed: TrailCommittedRuntime;
  readonly pendingPlans: readonly TrailPendingPlan[];
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

export type ProjectDiagnosticField =
  | "description"
  | "due"
  | "initiativeId"
  | "labelIds"
  | "priority"
  | "statusDefinitionId"
  | "title";

export type WorkflowIssueDiagnosticField =
  | "createdAt"
  | "description"
  | "due"
  | "estimate"
  | "firstStartedAt"
  | "labelIds"
  | "milestoneId"
  | "priority"
  | "projectId"
  | "statusDefinitionId"
  | "terminalAt"
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

export interface ProjectReconcileDiff {
  readonly addedIssueIds: readonly string[];
  readonly changedIssueFieldsById: Readonly<Record<
    string,
    readonly WorkflowIssueDiagnosticField[]
  >>;
  readonly changedIssueIds: readonly string[];
  readonly projectChangedFields: readonly ProjectDiagnosticField[];
  readonly projectId: string;
  readonly projectWasAdded: boolean;
  readonly removedIssueIds: readonly string[];
}

export interface ProjectReconcileResult {
  readonly diff: ProjectReconcileDiff;
  readonly issueCount: number;
  readonly projectCount: number;
  readonly revision: number;
}

function createEmptyCommittedRuntime(): TrailCommittedRuntime {
  return {
    configuration: null,
    issuesByProjectId: {},
    projectIds: [],
    projectsById: {},
    revision: 0,
    sourceByEntityId: {},
    sourceEntityIdsByPath: {},
    sourceIssues: [],
    sourceIssuesByPath: {},
    triageIssueIds: [],
    triageIssuesById: {},
    workflowIssuesById: {},
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

export function setTrailRuntimeConfiguration(
  store: TrailRuntimeStore,
  configuration: TrailConfiguration,
): void {
  store.setState((state) => ({
    availability: state.availability,
    committed: {
      ...state.committed,
      configuration,
      revision: state.committed.revision + 1,
    },
    pendingPlans: state.pendingPlans,
  }));
}

function aggregateSourceIssues(
  sourceIssuesByPath: Readonly<Record<string, readonly TrailSourceIssue[]>>,
): readonly TrailSourceIssue[] {
  return Object.keys(sourceIssuesByPath)
    .sort()
    .flatMap((path) => sourceIssuesByPath[path] ?? []);
}

export function setSourceIssuesForPath(
  store: TrailRuntimeStore,
  filePath: string,
  issues: readonly TrailSourceIssue[],
): void {
  store.setState((state) => {
    const sourceIssuesByPath = { ...state.committed.sourceIssuesByPath };
    if (issues.length === 0) {
      delete sourceIssuesByPath[filePath];
    } else {
      sourceIssuesByPath[filePath] = [...issues];
    }
    return {
      availability: state.availability,
      committed: {
        ...state.committed,
        revision: state.committed.revision + 1,
        sourceIssues: aggregateSourceIssues(sourceIssuesByPath),
        sourceIssuesByPath,
      },
      pendingPlans: state.pendingPlans,
    };
  });
}

export function selectSourceIssuesForPath(
  state: TrailRuntimeState,
  filePath: string | undefined,
): readonly TrailSourceIssue[] {
  if (filePath === undefined) return EMPTY_SOURCE_ISSUES;
  return state.committed.sourceIssuesByPath[filePath] ?? EMPTY_SOURCE_ISSUES;
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

function sortProjectIds(
  projectsById: Readonly<Record<string, TrailProject>>,
): readonly string[] {
  return Object.values(projectsById)
    .slice()
    .sort((left, right) => {
      const title = left.title.localeCompare(right.title);
      return title !== 0 ? title : left.id.localeCompare(right.id);
    })
    .map((project) => project.id);
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

function changedProjectFields(
  previous: TrailProject,
  next: TrailProject,
): readonly ProjectDiagnosticField[] {
  const changed: ProjectDiagnosticField[] = [];
  if (previous.description !== next.description) changed.push("description");
  if (previous.due !== next.due) changed.push("due");
  if (previous.initiativeId !== next.initiativeId) changed.push("initiativeId");
  if (!sameTrailStringArray(previous.labelIds, next.labelIds)) changed.push("labelIds");
  if (previous.priority !== next.priority) changed.push("priority");
  if (previous.statusDefinitionId !== next.statusDefinitionId) {
    changed.push("statusDefinitionId");
  }
  if (previous.title !== next.title) changed.push("title");
  return changed;
}

function changedWorkflowIssueFields(
  previous: TrailWorkflowIssue,
  next: TrailWorkflowIssue,
): readonly WorkflowIssueDiagnosticField[] {
  const changed: WorkflowIssueDiagnosticField[] = [];
  if (previous.createdAt !== next.createdAt) changed.push("createdAt");
  if (previous.description !== next.description) changed.push("description");
  if (previous.due !== next.due) changed.push("due");
  if (previous.estimate !== next.estimate) changed.push("estimate");
  if (previous.firstStartedAt !== next.firstStartedAt) changed.push("firstStartedAt");
  if (!sameTrailStringArray(previous.labelIds, next.labelIds)) changed.push("labelIds");
  if (previous.milestoneId !== next.milestoneId) changed.push("milestoneId");
  if (previous.priority !== next.priority) changed.push("priority");
  if (previous.projectId !== next.projectId) changed.push("projectId");
  if (previous.statusDefinitionId !== next.statusDefinitionId) {
    changed.push("statusDefinitionId");
  }
  if (previous.terminalAt !== next.terminalAt) changed.push("terminalAt");
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

function assertSourceIdentityAvailable(
  state: TrailRuntimeState,
  filePath: string,
  entityIds: readonly string[],
): void {
  for (const entityId of entityIds) {
    const owner = state.committed.sourceByEntityId[entityId];
    if (owner !== undefined && owner !== filePath) {
      throw new Error(
        `Duplicate Trail entity identity ${entityId} in ${owner} and ${filePath}`,
      );
    }
  }
}

function clearSourceIssuesFromCommitted(
  committed: TrailCommittedRuntime,
  filePath: string,
): Pick<TrailCommittedRuntime, "sourceIssues" | "sourceIssuesByPath"> {
  const sourceIssuesByPath = { ...committed.sourceIssuesByPath };
  delete sourceIssuesByPath[filePath];
  return {
    sourceIssues: aggregateSourceIssues(sourceIssuesByPath),
    sourceIssuesByPath,
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
    const incomingIds = Object.keys(contribution.issuesById);
    assertSourceIdentityAvailable(state, contribution.filePath, incomingIds);
    const triageIssuesById: Record<string, TrailTriageIssue> = {};
    const sourceByEntityId = { ...state.committed.sourceByEntityId };
    const previousSourceIds = state.committed.sourceEntityIdsByPath[
      contribution.filePath
    ] ?? [];
    for (const id of previousSourceIds) {
      delete sourceByEntityId[id];
    }

    for (const [id, incoming] of Object.entries(contribution.issuesById)) {
      const existing = state.committed.triageIssuesById[id];
      triageIssuesById[id] =
        existing !== undefined && sameTrailTriageIssue(existing, incoming)
          ? existing
          : incoming;
      sourceByEntityId[id] = contribution.filePath;
    }

    const sourceEntityIdsByPath = {
      ...state.committed.sourceEntityIdsByPath,
      [contribution.filePath]: incomingIds.slice().sort(),
    };
    const triageIssueIds = sortTriageIssueIds(triageIssuesById);
    const clearedIssues = clearSourceIssuesFromCommitted(
      state.committed,
      contribution.filePath,
    );
    revision = state.committed.revision + 1;
    triageCount = triageIssueIds.length;

    return {
      availability: state.availability,
      committed: {
        ...state.committed,
        ...clearedIssues,
        revision,
        sourceByEntityId,
        sourceEntityIdsByPath,
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
  const filePath = sourceIssues[0]?.filePath;
  if (filePath === undefined) {
    return;
  }
  setSourceIssuesForPath(store, filePath, sourceIssues);
}

function buildProjectReconcileDiff(
  previousProject: TrailProject | undefined,
  previousIssues: Readonly<Record<string, TrailWorkflowIssue>>,
  next: TrailProjectContribution,
): ProjectReconcileDiff {
  const previousIds = new Set(Object.keys(previousIssues));
  const nextIds = new Set(Object.keys(next.issuesById));
  const changedIssueFieldsById: Record<
    string,
    readonly WorkflowIssueDiagnosticField[]
  > = {};

  for (const id of [...nextIds].filter((value) => previousIds.has(value)).sort()) {
    const previousIssue = previousIssues[id];
    const nextIssue = next.issuesById[id];
    if (previousIssue === undefined || nextIssue === undefined) continue;
    const changedFields = changedWorkflowIssueFields(previousIssue, nextIssue);
    if (changedFields.length > 0) changedIssueFieldsById[id] = changedFields;
  }

  return {
    addedIssueIds: [...nextIds].filter((id) => !previousIds.has(id)).sort(),
    changedIssueFieldsById,
    changedIssueIds: Object.keys(changedIssueFieldsById).sort(),
    projectChangedFields: previousProject === undefined
      ? []
      : changedProjectFields(previousProject, next.project),
    projectId: next.project.id,
    projectWasAdded: previousProject === undefined,
    removedIssueIds: [...previousIds].filter((id) => !nextIds.has(id)).sort(),
  };
}

/** Reconciles one Project file contribution without rescanning unrelated projects. */
export function reconcileProjectContribution(
  store: TrailRuntimeStore,
  contribution: TrailProjectContribution,
): ProjectReconcileResult {
  let result: ProjectReconcileResult | undefined;

  store.setState((state) => {
    const previousSourceIds = state.committed.sourceEntityIdsByPath[
      contribution.filePath
    ] ?? [];
    const previousProjectId = previousSourceIds.find(
      (id) => state.committed.projectsById[id] !== undefined,
    );
    const previousProject = previousProjectId === undefined
      ? undefined
      : state.committed.projectsById[previousProjectId];
    const previousIssues: Record<string, TrailWorkflowIssue> = {};
    for (const id of previousSourceIds) {
      const issue = state.committed.workflowIssuesById[id];
      if (issue !== undefined) previousIssues[id] = issue;
    }

    const incomingIds = [
      contribution.project.id,
      ...Object.keys(contribution.issuesById),
    ];
    assertSourceIdentityAvailable(state, contribution.filePath, incomingIds);
    const diff = buildProjectReconcileDiff(
      previousProject,
      previousIssues,
      contribution,
    );

    const projectsById = { ...state.committed.projectsById };
    const workflowIssuesById = { ...state.committed.workflowIssuesById };
    const sourceByEntityId = { ...state.committed.sourceByEntityId };
    const issuesByProjectId = { ...state.committed.issuesByProjectId };

    for (const id of previousSourceIds) {
      delete sourceByEntityId[id];
      delete workflowIssuesById[id];
      if (projectsById[id] !== undefined) delete projectsById[id];
    }
    if (previousProjectId !== undefined) delete issuesByProjectId[previousProjectId];

    const existingProject = state.committed.projectsById[contribution.project.id];
    projectsById[contribution.project.id] =
      existingProject !== undefined
      && sameTrailProject(existingProject, contribution.project)
        ? existingProject
        : contribution.project;
    sourceByEntityId[contribution.project.id] = contribution.filePath;

    const issueIds = Object.keys(contribution.issuesById).sort();
    for (const id of issueIds) {
      const incoming = contribution.issuesById[id];
      const existing = state.committed.workflowIssuesById[id];
      workflowIssuesById[id] =
        existing !== undefined && sameTrailWorkflowIssue(existing, incoming)
          ? existing
          : incoming;
      sourceByEntityId[id] = contribution.filePath;
    }
    issuesByProjectId[contribution.project.id] = issueIds;

    const sourceEntityIdsByPath = {
      ...state.committed.sourceEntityIdsByPath,
      [contribution.filePath]: incomingIds.slice().sort(),
    };
    const clearedIssues = clearSourceIssuesFromCommitted(
      state.committed,
      contribution.filePath,
    );
    const revision = state.committed.revision + 1;
    result = {
      diff,
      issueCount: Object.keys(workflowIssuesById).length,
      projectCount: Object.keys(projectsById).length,
      revision,
    };

    return {
      availability: state.availability,
      committed: {
        ...state.committed,
        ...clearedIssues,
        issuesByProjectId,
        projectIds: sortProjectIds(projectsById),
        projectsById,
        revision,
        sourceByEntityId,
        sourceEntityIdsByPath,
        workflowIssuesById,
      },
      pendingPlans: state.pendingPlans,
    };
  });

  if (result === undefined) {
    throw new Error("Project reconciliation did not produce a result");
  }
  return result;
}

/** Removes one Project source contribution after an authoritative file deletion/rename. */
export function removeProjectContribution(
  store: TrailRuntimeStore,
  filePath: string,
): void {
  store.setState((state) => {
    const previousSourceIds = state.committed.sourceEntityIdsByPath[filePath] ?? [];
    if (previousSourceIds.length === 0) {
      const sourceIssuesByPath = { ...state.committed.sourceIssuesByPath };
      delete sourceIssuesByPath[filePath];
      return {
        availability: state.availability,
        committed: {
          ...state.committed,
          sourceIssues: aggregateSourceIssues(sourceIssuesByPath),
          sourceIssuesByPath,
        },
        pendingPlans: state.pendingPlans,
      };
    }

    const projectsById = { ...state.committed.projectsById };
    const workflowIssuesById = { ...state.committed.workflowIssuesById };
    const sourceByEntityId = { ...state.committed.sourceByEntityId };
    const sourceEntityIdsByPath = { ...state.committed.sourceEntityIdsByPath };
    const issuesByProjectId = { ...state.committed.issuesByProjectId };

    for (const id of previousSourceIds) {
      delete sourceByEntityId[id];
      delete workflowIssuesById[id];
      if (projectsById[id] !== undefined) {
        delete projectsById[id];
        delete issuesByProjectId[id];
      }
    }
    delete sourceEntityIdsByPath[filePath];
    const sourceIssuesByPath = { ...state.committed.sourceIssuesByPath };
    delete sourceIssuesByPath[filePath];

    return {
      availability: state.availability,
      committed: {
        ...state.committed,
        issuesByProjectId,
        projectIds: sortProjectIds(projectsById),
        projectsById,
        revision: state.committed.revision + 1,
        sourceByEntityId,
        sourceEntityIdsByPath,
        sourceIssues: aggregateSourceIssues(sourceIssuesByPath),
        sourceIssuesByPath,
        workflowIssuesById,
      },
      pendingPlans: state.pendingPlans,
    };
  });
}

export function addPendingPlan(
  store: TrailRuntimeStore,
  plan: TrailPendingPlan,
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

function applyPendingTriagePlan(
  effective: Record<string, TrailTriageIssue>,
  plan: TrailPendingPlan,
): void {
  switch (plan.kind) {
    case "create-triage-issue":
    case "update-triage-issue":
      effective[plan.issue.id] = plan.issue;
      break;
    case "delete-triage-issue":
      delete effective[plan.issueId];
      break;
    default:
      break;
  }
}

function effectiveTriageIssuesById(
  state: TrailRuntimeState,
): Record<string, TrailTriageIssue> {
  const effective: Record<string, TrailTriageIssue> = {
    ...state.committed.triageIssuesById,
  };
  for (const plan of state.pendingPlans) applyPendingTriagePlan(effective, plan);
  return effective;
}

function effectiveProjectsById(
  state: TrailRuntimeState,
): Record<string, TrailProject> {
  const effective = { ...state.committed.projectsById };
  for (const plan of state.pendingPlans) {
    if (plan.kind === "create-project") effective[plan.project.id] = plan.project;
  }
  return effective;
}

function effectiveWorkflowIssuesById(
  state: TrailRuntimeState,
): Record<string, TrailWorkflowIssue> {
  const effective = { ...state.committed.workflowIssuesById };
  for (const plan of state.pendingPlans) {
    if (
      plan.kind === "create-workflow-issue"
      || plan.kind === "update-workflow-issue"
    ) {
      effective[plan.issue.id] = plan.issue;
    }
  }
  return effective;
}

const STATUS_CATEGORY_ORDER = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
] as const;

const PRIORITY_ORDER = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

function workflowIssueSortKey(
  state: TrailRuntimeState,
  issue: TrailWorkflowIssue,
): readonly [number, number, number, string] {
  const definitions = state.committed.configuration?.statuses.issue;
  let categoryIndex: number = STATUS_CATEGORY_ORDER.length;
  if (definitions !== undefined) {
    for (let index = 0; index < STATUS_CATEGORY_ORDER.length; index += 1) {
      const category = STATUS_CATEGORY_ORDER[index];
      if (definitions[category].definitions.some(
        (definition) => definition.id === issue.statusDefinitionId,
      )) {
        categoryIndex = index;
        break;
      }
    }
  }
  const priorityIndex = issue.priority === undefined
    ? Object.keys(PRIORITY_ORDER).length
    : PRIORITY_ORDER[issue.priority];
  const time = categoryIndex === STATUS_CATEGORY_ORDER.indexOf("started")
    ? issue.firstStartedAt ?? issue.createdAt
    : issue.createdAt;
  return [categoryIndex, priorityIndex, time, issue.id];
}

export function selectEffectiveTriageIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailTriageIssue | undefined {
  return effectiveTriageIssuesById(state)[issueId];
}

/** Effective Triage ordering is Due-first, then stable identity. */
export function selectEffectiveTriageIssueIds(
  state: TrailRuntimeState,
): readonly string[] {
  return sortTriageIssueIds(effectiveTriageIssuesById(state));
}

export function selectEffectiveIssueIdSet(
  state: TrailRuntimeState,
): ReadonlySet<string> {
  return new Set([
    ...selectEffectiveTriageIssueIds(state),
    ...Object.keys(effectiveWorkflowIssuesById(state)),
  ]);
}

export function selectIsTriageIssuePending(
  state: TrailRuntimeState,
  issueId: string,
): boolean {
  return state.pendingPlans.some((plan) => (
    (plan.kind === "create-triage-issue"
      || plan.kind === "update-triage-issue"
      || plan.kind === "delete-triage-issue")
    && affectedTriageIssueId(plan) === issueId
  ));
}

export function selectEffectiveProjectById(
  state: TrailRuntimeState,
  projectId: string,
): TrailProject | undefined {
  return effectiveProjectsById(state)[projectId];
}

export function selectEffectiveProjectIds(
  state: TrailRuntimeState,
): readonly string[] {
  return sortProjectIds(effectiveProjectsById(state));
}

export function selectEffectiveWorkflowIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailWorkflowIssue | undefined {
  return effectiveWorkflowIssuesById(state)[issueId];
}

export function selectEffectiveWorkflowIssueIdsByProject(
  state: TrailRuntimeState,
  projectId: string,
): readonly string[] {
  return Object.values(effectiveWorkflowIssuesById(state))
    .filter((issue) => issue.projectId === projectId)
    .sort((left, right) => {
      const leftKey = workflowIssueSortKey(state, left);
      const rightKey = workflowIssueSortKey(state, right);
      for (let index = 0; index < leftKey.length - 1; index += 1) {
        const leftValue = leftKey[index];
        const rightValue = rightKey[index];
        if (leftValue !== rightValue) {
          return Number(leftValue) - Number(rightValue);
        }
      }
      return String(leftKey[3]).localeCompare(String(rightKey[3]));
    })
    .map((issue) => issue.id);
}

export function selectIsWorkflowEntityPending(
  state: TrailRuntimeState,
  entityId: string,
): boolean {
  return state.pendingPlans.some((plan) => (
    (plan.kind === "create-project"
      || plan.kind === "create-workflow-issue"
      || plan.kind === "update-workflow-issue")
    && affectedWorkflowEntityId(plan) === entityId
  ));
}

export function selectEffectiveEntityIdSet(
  state: TrailRuntimeState,
): ReadonlySet<string> {
  return new Set([
    ...selectEffectiveProjectIds(state),
    ...selectEffectiveTriageIssueIds(state),
    ...Object.keys(effectiveWorkflowIssuesById(state)),
  ]);
}
