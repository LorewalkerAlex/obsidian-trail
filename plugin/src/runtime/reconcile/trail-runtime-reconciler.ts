import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import { sameTrailDomainEntity } from "../../domain/rules/trail-domain-equality";
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
  findTrailDomainEntity,
  type TrailCommittedRuntime,
  type TrailDomainState,
  type TrailRuntimeHealth,
  type TrailRuntimeStore,
} from "../store/trail-runtime-store";

export type TrailRuntimeAuthoritativeChange =
  | {
      readonly issues?: readonly TrailSourceProblem[];
      readonly kind: "replace-domain-source";
      readonly snapshot: TrailDomainSourceSnapshot;
    }
  | { readonly kind: "remove-domain-source"; readonly sourcePath: string }
  | { readonly kind: "replace-plugin-data"; readonly snapshot: TrailPluginDataSnapshot };

export interface TrailRuntimeCandidate {
  readonly committed: Omit<TrailCommittedRuntime, "revision">;
  readonly health: TrailRuntimeHealth;
}

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
  for (const entity of incoming) {
    const previous = findTrailDomainEntity(domainState, entity.value.id);
    assignEntity(
      domain,
      previous !== undefined && sameTrailDomainEntity(previous, entity) ? previous : entity,
    );
  }
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

/** Builds a post-write candidate without exposing partially reconciled committed state. */
export function buildTrailRuntimeCandidateAfterChanges(input: {
  readonly changes: readonly TrailRuntimeAuthoritativeChange[];
  readonly committed: TrailCommittedRuntime;
  readonly health: TrailRuntimeHealth;
}): TrailRuntimeCandidate {
  let domain = input.committed.authoritative.domain;
  let ownership = input.committed.ownership;
  let configuration = input.committed.authoritative.configuration;
  let workspaceState = input.committed.authoritative.workspaceState;
  let health = input.health;

  for (const change of input.changes) {
    switch (change.kind) {
      case "replace-domain-source": {
        const replaced = replaceContribution(domain, ownership, change.snapshot);
        domain = replaced.domain;
        ownership = replaced.ownership;
        health = healthWithSourceIssues(
          health,
          change.snapshot.sourcePath,
          change.issues ?? [],
        );
        break;
      }
      case "remove-domain-source": {
        const mutable = mutableDomain(domain);
        for (const entityId of ownership.sourceEntityIdsByPath.get(change.sourcePath) ?? []) {
          deleteEntity(mutable, entityId);
        }
        domain = mutable;
        ownership = removeTrailSourceOwnership(ownership, change.sourcePath);
        health = healthWithSourceIssues(health, change.sourcePath, []);
        break;
      }
      case "replace-plugin-data":
        configuration = change.snapshot.configuration;
        workspaceState = change.snapshot.workspaceState;
        break;
    }
  }

  return {
    committed: {
      authoritative: { configuration, domain, workspaceState },
      indexes: buildTrailRuntimeIndexes(domain),
      ownership,
    },
    health,
  };
}
