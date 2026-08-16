import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import type { TrailDomainSourceSnapshot } from "../../persistence/domain-sources/trail-domain-source-snapshot";
import type { TrailSourceProblem } from "../../persistence/domain-sources/trail-source-result";
import type { TrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import { buildTrailRuntimeIndexes } from "../indexes/trail-runtime-indexes";
import {
  createEmptyTrailSourceOwnership,
  removeTrailSourceOwnership,
  replaceTrailSourceOwnership,
  type TrailSourceOwnership,
} from "../ownership/trail-source-ownership";
import {
  createEmptyTrailDomainState,
  type TrailCommittedRuntime,
  type TrailDomainState,
  type TrailRuntimeHealth,
  type TrailRuntimeStore,
} from "../store/trail-runtime-store";

function entitiesForSource(snapshot: TrailDomainSourceSnapshot): readonly TrailDomainEntity[] {
  switch (snapshot.kind) {
    case "initiative":
      return [{ kind: "initiative", value: snapshot.initiative }];
    case "project":
      return [
        { kind: "project", value: snapshot.project },
        ...snapshot.milestones.map((value) => ({ kind: "milestone" as const, value })),
        ...snapshot.issues.map((value) => ({ kind: "issue" as const, value })),
      ];
    case "triage":
    case "projectless-issues":
      return snapshot.issues.map((value) => ({ kind: "issue" as const, value }));
    case "cycles":
      return snapshot.cycles.map((value) => ({ kind: "cycle" as const, value }));
  }
}

function mutableDomain(domain: TrailDomainState) {
  return {
    cyclesById: new Map(domain.cyclesById),
    initiativesById: new Map(domain.initiativesById),
    issuesById: new Map(domain.issuesById),
    milestonesById: new Map(domain.milestonesById),
    projectsById: new Map(domain.projectsById),
  };
}

function deleteEntity(domain: ReturnType<typeof mutableDomain>, entityId: string): void {
  domain.initiativesById.delete(entityId);
  domain.projectsById.delete(entityId);
  domain.milestonesById.delete(entityId);
  domain.issuesById.delete(entityId);
  domain.cyclesById.delete(entityId);
}

function assignEntity(domain: ReturnType<typeof mutableDomain>, entity: TrailDomainEntity): void {
  switch (entity.kind) {
    case "initiative":
      domain.initiativesById.set(entity.value.id, entity.value);
      break;
    case "project":
      domain.projectsById.set(entity.value.id, entity.value);
      break;
    case "milestone":
      domain.milestonesById.set(entity.value.id, entity.value);
      break;
    case "issue":
      domain.issuesById.set(entity.value.id, entity.value);
      break;
    case "cycle":
      domain.cyclesById.set(entity.value.id, entity.value);
      break;
  }
}

function replaceContribution(
  domainState: TrailDomainState,
  ownershipState: TrailSourceOwnership,
  snapshot: TrailDomainSourceSnapshot,
): { readonly domain: TrailDomainState; readonly ownership: TrailSourceOwnership } {
  const incoming = entitiesForSource(snapshot);
  const incomingIds = incoming.map(({ value }) => value.id);
  const ownership = replaceTrailSourceOwnership(ownershipState, snapshot.sourcePath, incomingIds);
  const domain = mutableDomain(domainState);
  for (const entityId of ownershipState.sourceEntityIdsByPath.get(snapshot.sourcePath) ?? []) {
    deleteEntity(domain, entityId);
  }
  for (const entity of incoming) assignEntity(domain, entity);
  return { domain, ownership };
}

function healthWithSourceIssues(
  health: TrailRuntimeHealth,
  sourcePath: string,
  issues: readonly TrailSourceProblem[],
): TrailRuntimeHealth {
  const sourceIssuesByPath = { ...health.sourceIssuesByPath };
  if (issues.length === 0) delete sourceIssuesByPath[sourcePath];
  else sourceIssuesByPath[sourcePath] = issues.map((issue) => ({ ...issue, sourcePath }));
  return { sourceIssuesByPath };
}

/** Replaces exactly one authoritative source contribution and advances committed revision once. */
export function replaceTrailDomainSource(
  store: TrailRuntimeStore,
  snapshot: TrailDomainSourceSnapshot,
  issues: readonly TrailSourceProblem[] = [],
): void {
  store.setState((state) => {
    const replaced = replaceContribution(
      state.committed.authoritative.domain,
      state.committed.ownership,
      snapshot,
    );
    return {
      committed: {
        authoritative: {
          ...state.committed.authoritative,
          domain: replaced.domain,
        },
        indexes: buildTrailRuntimeIndexes(replaced.domain),
        ownership: replaced.ownership,
        revision: state.committed.revision + 1,
      },
      health: healthWithSourceIssues(state.health, snapshot.sourcePath, issues),
    };
  });
}

/** Removes one authoritative source contribution without guessing replacement facts. */
export function removeTrailDomainSource(
  store: TrailRuntimeStore,
  sourcePath: string,
  issues: readonly TrailSourceProblem[] = [],
): void {
  store.setState((state) => {
    const domain = mutableDomain(state.committed.authoritative.domain);
    for (const entityId of state.committed.ownership.sourceEntityIdsByPath.get(sourcePath) ?? []) {
      deleteEntity(domain, entityId);
    }
    const ownership = removeTrailSourceOwnership(state.committed.ownership, sourcePath);
    return {
      committed: {
        authoritative: { ...state.committed.authoritative, domain },
        indexes: buildTrailRuntimeIndexes(domain),
        ownership,
        revision: state.committed.revision + 1,
      },
      health: healthWithSourceIssues(state.health, sourcePath, issues),
    };
  });
}

export function replaceTrailPluginData(
  store: TrailRuntimeStore,
  snapshot: TrailPluginDataSnapshot,
): void {
  store.setState((state) => ({
    committed: {
      ...state.committed,
      authoritative: {
        ...state.committed.authoritative,
        configuration: snapshot.configuration,
        workspaceState: snapshot.workspaceState,
      },
      revision: state.committed.revision + 1,
    },
  }));
}

/** Builds a complete candidate in memory; the caller publishes it atomically afterward. */
export function buildTrailCommittedRuntimeCandidate(input: {
  readonly pluginData: TrailPluginDataSnapshot;
  readonly sources: readonly TrailDomainSourceSnapshot[];
}): Omit<TrailCommittedRuntime, "revision"> {
  let domain: TrailDomainState = createEmptyTrailDomainState();
  let ownership: TrailSourceOwnership = createEmptyTrailSourceOwnership();
  for (const source of input.sources) {
    const replaced = replaceContribution(domain, ownership, source);
    domain = replaced.domain;
    ownership = replaced.ownership;
  }
  return {
    authoritative: {
      configuration: input.pluginData.configuration,
      domain,
      workspaceState: input.pluginData.workspaceState,
    },
    indexes: buildTrailRuntimeIndexes(domain),
    ownership,
  };
}

export function publishTrailCommittedRuntime(
  store: TrailRuntimeStore,
  candidate: Omit<TrailCommittedRuntime, "revision">,
  health: TrailRuntimeHealth,
): void {
  store.setState((state) => ({
    committed: { ...candidate, revision: state.committed.revision + 1 },
    health,
  }));
}
