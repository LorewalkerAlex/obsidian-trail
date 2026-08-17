import { createStore, type StoreApi } from "zustand/vanilla";

import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type {
  TrailCycle,
  TrailDomainEntity,
  TrailInitiative,
  TrailIssue,
  TrailMilestone,
  TrailProject,
} from "../../domain/model/trail-entities";
import type { TrailWorkspaceState } from "../../domain/model/trail-workspace-state";
import type { TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import type { TrailSourceProblem } from "../../persistence/domain-sources/trail-source-result";
import type { TrailRuntimeControl } from "../control/trail-runtime-control";
import { buildTrailRuntimeIndexes, type TrailRuntimeIndexes } from "../indexes/trail-runtime-indexes";
import {
  createEmptyTrailSourceOwnership,
  type TrailSourceOwnership,
} from "../ownership/trail-source-ownership";

export interface TrailDomainState {
  readonly cyclesById: ReadonlyMap<string, TrailCycle>;
  readonly initiativesById: ReadonlyMap<string, TrailInitiative>;
  readonly issuesById: ReadonlyMap<string, TrailIssue>;
  readonly milestonesById: ReadonlyMap<string, TrailMilestone>;
  readonly projectsById: ReadonlyMap<string, TrailProject>;
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

export type TrailRuntimeStore = StoreApi<TrailRuntimeState>;

export function createEmptyTrailDomainState(): TrailDomainState {
  return {
    cyclesById: new Map(),
    initiativesById: new Map(),
    issuesById: new Map(),
    milestonesById: new Map(),
    projectsById: new Map(),
  };
}

export function createEmptyTrailAuthoritativeState(): TrailAuthoritativeState {
  return {
    configuration: null,
    domain: createEmptyTrailDomainState(),
    workspaceState: null,
  };
}

export function createEmptyTrailCommittedRuntime(): TrailCommittedRuntime {
  const authoritative = createEmptyTrailAuthoritativeState();
  return {
    authoritative,
    indexes: buildTrailRuntimeIndexes(authoritative.domain),
    ownership: createEmptyTrailSourceOwnership(),
    revision: 0,
  };
}

export function createTrailRuntimeStore(): TrailRuntimeStore {
  return createStore<TrailRuntimeState>()(() => ({
    committed: createEmptyTrailCommittedRuntime(),
    control: { kind: "loading" },
    health: { sourceIssuesByPath: {} },
    pending: [],
  }));
}

export function findTrailDomainEntity(
  domain: TrailDomainState,
  entityId: string,
): TrailDomainEntity | undefined {
  const initiative = domain.initiativesById.get(entityId);
  if (initiative !== undefined) return { kind: "initiative", value: initiative };
  const project = domain.projectsById.get(entityId);
  if (project !== undefined) return { kind: "project", value: project };
  const milestone = domain.milestonesById.get(entityId);
  if (milestone !== undefined) return { kind: "milestone", value: milestone };
  const issue = domain.issuesById.get(entityId);
  if (issue !== undefined) return { kind: "issue", value: issue };
  const cycle = domain.cyclesById.get(entityId);
  if (cycle !== undefined) return { kind: "cycle", value: cycle };
  return undefined;
}

export function setTrailRuntimeControl(
  store: TrailRuntimeStore,
  control: TrailRuntimeControl,
): void {
  store.setState({ control });
}

export function setTrailRuntimeSourceIssues(
  store: TrailRuntimeStore,
  sourcePath: string,
  issues: readonly TrailSourceProblem[],
): void {
  store.setState((state) => {
    const sourceIssuesByPath = { ...state.health.sourceIssuesByPath };
    if (issues.length === 0) delete sourceIssuesByPath[sourcePath];
    else sourceIssuesByPath[sourcePath] = issues.map((issue) => ({ ...issue, sourcePath }));
    return { health: { sourceIssuesByPath } };
  });
}
