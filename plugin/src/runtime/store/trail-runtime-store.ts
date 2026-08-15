import { createStore, type StoreApi } from "zustand/vanilla";

import type {
  TrailConfiguration,
  TrailWorkspaceState,
} from "../../domain/trail-configuration";
import type {
  TrailCycle,
  TrailInitiative,
  TrailMilestone,
} from "../../domain/model/trail-core-entities";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import type { TrailSourceProblem } from "../../persistence/domain-sources/trail-source-result";
import type { TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import type { TrailRuntimeAvailability } from "../control/trail-runtime-control";

const EMPTY_SOURCE_ISSUES: readonly TrailSourceProblem[] = Object.freeze([]);

export interface TrailCommittedRuntime {
  readonly configuration: TrailConfiguration | null;
  readonly cyclesById: Readonly<Record<string, TrailCycle>>;
  readonly initiativesById: Readonly<Record<string, TrailInitiative>>;
  readonly issuesByProjectId: Readonly<Record<string, readonly string[]>>;
  readonly milestonesById: Readonly<Record<string, TrailMilestone>>;
  readonly projectIds: readonly string[];
  readonly projectsById: Readonly<Record<string, TrailProject>>;
  readonly revision: number;
  readonly sourceByEntityId: Readonly<Record<string, string>>;
  readonly sourceEntityIdsByPath: Readonly<Record<string, readonly string[]>>;
  readonly sourceIssues: readonly TrailSourceProblem[];
  readonly sourceIssuesByPath: Readonly<Record<string, readonly TrailSourceProblem[]>>;
  readonly triageIssueIds: readonly string[];
  readonly triageIssuesById: Readonly<Record<string, TrailTriageIssue>>;
  readonly workflowIssuesById: Readonly<Record<string, TrailWorkflowIssue>>;
  readonly workspaceState: TrailWorkspaceState | null;
}

export interface TrailRuntimeState {
  readonly availability: TrailRuntimeAvailability;
  readonly committed: TrailCommittedRuntime;
  readonly pendingPlans: readonly TrailMutationPlan[];
}

export type TrailRuntimeStore = StoreApi<TrailRuntimeState>;

function createEmptyCommittedRuntime(): TrailCommittedRuntime {
  return {
    configuration: null,
    cyclesById: {},
    initiativesById: {},
    issuesByProjectId: {},
    milestonesById: {},
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
    workspaceState: null,
  };
}

export function createTrailRuntimeStore(): TrailRuntimeStore {
  return createStore<TrailRuntimeState>()(() => ({
    availability: { kind: "idle" },
    committed: createEmptyCommittedRuntime(),
    pendingPlans: [],
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

/** Publishes authoritative user Workspace State without coupling it to UI-local state. */
export function setTrailRuntimeWorkspaceState(
  store: TrailRuntimeStore,
  workspaceState: TrailWorkspaceState,
): void {
  store.setState((state) => ({
    availability: state.availability,
    committed: {
      ...state.committed,
      revision: state.committed.revision + 1,
      workspaceState,
    },
    pendingPlans: state.pendingPlans,
  }));
}

export function aggregateSourceIssues(
  sourceIssuesByPath: Readonly<Record<string, readonly TrailSourceProblem[]>>,
): readonly TrailSourceProblem[] {
  return Object.keys(sourceIssuesByPath)
    .sort()
    .flatMap((path) => sourceIssuesByPath[path] ?? []);
}

export function clearSourceIssuesFromCommitted(
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

export function setSourceIssuesForPath(
  store: TrailRuntimeStore,
  filePath: string,
  issues: readonly TrailSourceProblem[],
): void {
  store.setState((state) => {
    const sourceIssuesByPath = { ...state.committed.sourceIssuesByPath };
    if (issues.length === 0) {
      delete sourceIssuesByPath[filePath];
    } else {
      // Runtime keeps only the stable logical source-problem shape; parser offsets stay below Persistence.
      sourceIssuesByPath[filePath] = issues.map((issue) => ({
        code: issue.code,
        filePath,
        message: issue.message,
        objectId: issue.objectId,
        scope: issue.scope,
      }));
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
): readonly TrailSourceProblem[] {
  if (filePath === undefined) return EMPTY_SOURCE_ISSUES;
  return state.committed.sourceIssuesByPath[filePath] ?? EMPTY_SOURCE_ISSUES;
}
