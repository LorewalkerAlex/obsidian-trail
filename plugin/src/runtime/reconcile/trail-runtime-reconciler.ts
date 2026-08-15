import {
  sameTrailStringArray,
  sameTrailTriageIssue,
  sameTrailWorkflowIssue,
  type TrailTriageIssue,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import { sameTrailProject, type TrailProject } from "../../domain/trail-project";
import type { TrailSourceProblem } from "../../persistence/domain-sources/trail-source-result";
import type {
  TrailProjectSourceSnapshot,
  TrailTriageSourceSnapshot,
} from "../../persistence/domain-sources/trail-domain-source-snapshot";
import {
  sortTrailProjectIds,
  sortTrailTriageIssueIds,
} from "../indexes/trail-runtime-indexes";
import {
  removeTrailSourceOwnership,
  replaceTrailSourceOwnership,
} from "../ownership/trail-source-ownership";
import {
  aggregateSourceIssues,
  clearSourceIssuesFromCommitted,
  setSourceIssuesForPath,
  type TrailRuntimeStore,
} from "../store/trail-runtime-store";

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
    if (previousIssue === undefined || nextIssue === undefined) continue;
    const changedFields = changedTriageFields(previousIssue, nextIssue);
    if (changedFields.length > 0) changedFieldsById[id] = changedFields;
  }

  return {
    addedIds,
    changedFieldsById,
    changedIds: Object.keys(changedFieldsById).sort(),
    removedIds,
  };
}

/** Replaces the committed contribution from the authoritative Triage source. */
export function reconcileTriageContribution<
  TSnapshot extends TrailTriageSourceSnapshot,
>(
  store: TrailRuntimeStore,
  contribution: TSnapshot,
): TriageReconcileResult {
  const previous = store.getState().committed.triageIssuesById;
  const diff = buildTriageReconcileDiff(previous, contribution.issuesById);
  let revision = store.getState().committed.revision;
  let triageCount = 0;

  store.setState((state) => {
    const incomingIds = Object.keys(contribution.issuesById);
    const ownership = replaceTrailSourceOwnership(
      state.committed,
      contribution.filePath,
      incomingIds,
    );
    const triageIssuesById: Record<string, TrailTriageIssue> = {};

    for (const [id, incoming] of Object.entries(contribution.issuesById)) {
      const existing = state.committed.triageIssuesById[id];
      triageIssuesById[id] =
        existing !== undefined && sameTrailTriageIssue(existing, incoming)
          ? existing
          : incoming;
    }

    const triageIssueIds = sortTrailTriageIssueIds(triageIssuesById);
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
        ...ownership,
        revision,
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
  sourceIssues: readonly TrailSourceProblem[],
): void {
  const filePath = sourceIssues[0]?.filePath;
  if (filePath === undefined) return;
  setSourceIssuesForPath(store, filePath, sourceIssues);
}

function buildProjectReconcileDiff(
  previousProject: TrailProject | undefined,
  previousIssues: Readonly<Record<string, TrailWorkflowIssue>>,
  next: TrailProjectSourceSnapshot,
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

/** Reconciles one Project source without rescanning unrelated Project files. */
export function reconcileProjectContribution<
  TSnapshot extends TrailProjectSourceSnapshot,
>(
  store: TrailRuntimeStore,
  contribution: TSnapshot,
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
    const ownership = replaceTrailSourceOwnership(
      state.committed,
      contribution.filePath,
      incomingIds,
    );
    const diff = buildProjectReconcileDiff(
      previousProject,
      previousIssues,
      contribution,
    );

    const projectsById = { ...state.committed.projectsById };
    const workflowIssuesById = { ...state.committed.workflowIssuesById };
    const issuesByProjectId = { ...state.committed.issuesByProjectId };

    for (const id of previousSourceIds) {
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

    const issueIds = Object.keys(contribution.issuesById).sort();
    for (const id of issueIds) {
      const incoming = contribution.issuesById[id];
      const existing = state.committed.workflowIssuesById[id];
      workflowIssuesById[id] =
        existing !== undefined && sameTrailWorkflowIssue(existing, incoming)
          ? existing
          : incoming;
    }
    issuesByProjectId[contribution.project.id] = issueIds;

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
        ...ownership,
        issuesByProjectId,
        projectIds: sortTrailProjectIds(projectsById),
        projectsById,
        revision,
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

/** Removes one Project source contribution after an authoritative deletion/rename. */
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
    const issuesByProjectId = { ...state.committed.issuesByProjectId };

    for (const id of previousSourceIds) {
      delete workflowIssuesById[id];
      if (projectsById[id] !== undefined) {
        delete projectsById[id];
        delete issuesByProjectId[id];
      }
    }

    const ownership = removeTrailSourceOwnership(state.committed, filePath);
    const sourceIssuesByPath = { ...state.committed.sourceIssuesByPath };
    delete sourceIssuesByPath[filePath];

    return {
      availability: state.availability,
      committed: {
        ...state.committed,
        ...ownership,
        issuesByProjectId,
        projectIds: sortTrailProjectIds(projectsById),
        projectsById,
        revision: state.committed.revision + 1,
        sourceIssues: aggregateSourceIssues(sourceIssuesByPath),
        sourceIssuesByPath,
        workflowIssuesById,
      },
      pendingPlans: state.pendingPlans,
    };
  });
}
