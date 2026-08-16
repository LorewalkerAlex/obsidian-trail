import { createStore, type StoreApi } from "zustand/vanilla";

import type {
  TrailConfiguration,
  TrailWorkspaceState,
} from "../../domain/trail-configuration";
import type {
  TrailCycle,
  TrailInitiative,
  TrailIssue,
  TrailMilestone,
} from "../../domain/model/trail-core-entities";
import type { TrailProject } from "../../domain/trail-project";
import type { TrailSourceProblem } from "../../persistence/domain-sources/trail-source-result";
import type { TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import type { TrailRuntimeControl } from "../control/trail-runtime-control";
import type { TrailRuntimeIndexes } from "../indexes/trail-runtime-indexes";
import type { TrailSourceOwnership } from "../ownership/trail-source-ownership";

const EMPTY_SOURCE_ISSUES: readonly TrailSourceProblem[] = Object.freeze([]);

export interface TrailDomainState {
  readonly cyclesById: Readonly<Record<string, TrailCycle>>;
  readonly initiativesById: Readonly<Record<string, TrailInitiative>>;
  readonly issuesById: Readonly<Record<string, TrailIssue>>;
  readonly milestonesById: Readonly<Record<string, TrailMilestone>>;
  readonly projectsById: Readonly<Record<string, TrailProject>>;
}

export interface TrailAuthoritativeState {
  readonly configuration: TrailConfiguration | null;
  readonly domain: TrailDomainState;
  readonly workspaceState: TrailWorkspaceState | null;
}

export interface TrailCommittedRuntime {
  readonly authoritative: TrailAuthoritativeState;
  readonly indexes: TrailRuntimeIndexes;
  readonly ownership: TrailSourceOwnership;
  readonly revision: number;
}

export interface TrailRuntimeHealth {
  readonly sourceIssuesByPath: Readonly<Record<string, readonly TrailSourceProblem[]>>;
}

export interface TrailRuntimeState {
  readonly committed: TrailCommittedRuntime;
  readonly control: TrailRuntimeControl;
  readonly health: TrailRuntimeHealth;
  readonly pending: readonly TrailMutationPlan[];
}

export interface TrailReloadCandidate {
  readonly committed: TrailCommittedRuntime;
  readonly health: TrailRuntimeHealth;
}

export type TrailRuntimeStore = StoreApi<TrailRuntimeState>;

function createEmptyAuthoritativeState(): TrailAuthoritativeState {
  return {
    configuration: null,
    domain: {
      cyclesById: {},
      initiativesById: {},
      issuesById: {},
      milestonesById: {},
      projectsById: {},
    },
    workspaceState: null,
  };
}

function createEmptyCommittedRuntime(): TrailCommittedRuntime {
  return {
    authoritative: createEmptyAuthoritativeState(),
    indexes: {
      issuesByProjectId: {},
    },
    ownership: {
      sourceByEntityId: {},
      sourceEntityIdsByPath: {},
    },
    revision: 0,
  };
}

export function createTrailRuntimeStore(): TrailRuntimeStore {
  return createStore<TrailRuntimeState>()(() => ({
    committed: createEmptyCommittedRuntime(),
    control: { kind: "loading" },
    health: { sourceIssuesByPath: {} },
    pending: [],
  }));
}

export function setTrailRuntimeConfiguration(
  store: TrailRuntimeStore,
  configuration: TrailConfiguration,
): void {
  store.setState((state) => ({
    committed: {
      ...state.committed,
      authoritative: {
        ...state.committed.authoritative,
        configuration,
      },
      revision: state.committed.revision + 1,
    },
  }));
}

/** Publishes authoritative user Workspace State without coupling it to UI-local state. */
export function setTrailRuntimeWorkspaceState(
  store: TrailRuntimeStore,
  workspaceState: TrailWorkspaceState,
): void {
  store.setState((state) => ({
    committed: {
      ...state.committed,
      authoritative: {
        ...state.committed.authoritative,
        workspaceState,
      },
      revision: state.committed.revision + 1,
    },
  }));
}

/** Captures only the reloadable authoritative/health portion of a staging Runtime. */
export function createTrailReloadCandidate(
  state: TrailRuntimeState,
): TrailReloadCandidate {
  return {
    committed: state.committed,
    health: state.health,
  };
}

/**
 * Atomically replaces the live authoritative snapshot after a complete reload.
 * Live revision remains monotonic and pending optimistic intent is left untouched.
 */
export function publishTrailReloadCandidate(
  store: TrailRuntimeStore,
  candidate: TrailReloadCandidate,
  timezone: string,
): void {
  store.setState((state) => ({
    committed: {
      ...candidate.committed,
      revision: state.committed.revision + 1,
    },
    control: { kind: "ready", timezone },
    health: candidate.health,
  }));
}

export function aggregateSourceIssues(
  sourceIssuesByPath: Readonly<Record<string, readonly TrailSourceProblem[]>>,
): readonly TrailSourceProblem[] {
  return Object.keys(sourceIssuesByPath)
    .sort()
    .flatMap((path) => sourceIssuesByPath[path] ?? []);
}

export function clearSourceIssuesFromHealth(
  health: TrailRuntimeHealth,
  filePath: string,
): TrailRuntimeHealth {
  const sourceIssuesByPath = { ...health.sourceIssuesByPath };
  delete sourceIssuesByPath[filePath];
  return { sourceIssuesByPath };
}

export function setSourceIssuesForPath(
  store: TrailRuntimeStore,
  filePath: string,
  issues: readonly TrailSourceProblem[],
): void {
  store.setState((state) => {
    const sourceIssuesByPath = { ...state.health.sourceIssuesByPath };
    if (issues.length === 0) {
      delete sourceIssuesByPath[filePath];
    } else {
      // Runtime health keeps only stable logical source problems; parser offsets stay below Persistence.
      sourceIssuesByPath[filePath] = issues.map((issue) => ({
        code: issue.code,
        filePath,
        message: issue.message,
        objectId: issue.objectId,
        scope: issue.scope,
      }));
    }
    return { health: { sourceIssuesByPath } };
  });
}

export function selectAllSourceIssues(
  state: TrailRuntimeState,
): readonly TrailSourceProblem[] {
  return aggregateSourceIssues(state.health.sourceIssuesByPath);
}

export function selectSourceIssuesForPath(
  state: TrailRuntimeState,
  filePath: string | undefined,
): readonly TrailSourceProblem[] {
  if (filePath === undefined) return EMPTY_SOURCE_ISSUES;
  return state.health.sourceIssuesByPath[filePath] ?? EMPTY_SOURCE_ISSUES;
}