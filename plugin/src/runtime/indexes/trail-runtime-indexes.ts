import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import { isTrailCycleOpen } from "../../domain/rules/trail-cycle-rules";
import type { TrailDomainState } from "../store/trail-runtime-store";

export interface TrailRuntimeIndexes {
  readonly currentCycleId?: string;
  readonly cyclesByIssueId: ReadonlyMap<string, readonly string[]>;
  readonly entityRefsByLabelId: ReadonlyMap<string, readonly string[]>;
  readonly entityRefsByStatusDefinitionId: ReadonlyMap<string, readonly string[]>;
  readonly issuesByCycleId: ReadonlyMap<string, readonly string[]>;
  readonly issuesByMilestoneId: ReadonlyMap<string, readonly string[]>;
  readonly issuesByProjectId: ReadonlyMap<string, readonly string[]>;
  readonly milestonesByProjectId: ReadonlyMap<string, readonly string[]>;
  readonly projectsByInitiativeId: ReadonlyMap<string, readonly string[]>;
}

function addIndexValue(index: Map<string, Set<string>>, key: string | undefined, value: string): void {
  if (key === undefined) return;
  const values = index.get(key) ?? new Set<string>();
  values.add(value);
  index.set(key, values);
}

function finalizeIndex(index: Map<string, Set<string>>): ReadonlyMap<string, readonly string[]> {
  return new Map(
    [...index.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, [...values].sort()] as const),
  );
}

function indexEntityLabels(
  index: Map<string, Set<string>>,
  entity: Extract<TrailDomainEntity, { kind: "initiative" | "issue" | "project" }>,
): void {
  for (const labelId of entity.value.labelIds) {
    addIndexValue(index, labelId, entity.value.id);
  }
}

/**
 * Builds rebuildable inverse/reference indexes from canonical Domain facts only.
 * Validation remains the authority for illegal references; indexes never repair or
 * reinterpret invalid Domain state.
 */
export function buildTrailRuntimeIndexes(domain: TrailDomainState): TrailRuntimeIndexes {
  const projectsByInitiativeId = new Map<string, Set<string>>();
  const milestonesByProjectId = new Map<string, Set<string>>();
  const issuesByProjectId = new Map<string, Set<string>>();
  const issuesByMilestoneId = new Map<string, Set<string>>();
  const issuesByCycleId = new Map<string, Set<string>>();
  const cyclesByIssueId = new Map<string, Set<string>>();
  const entityRefsByLabelId = new Map<string, Set<string>>();
  const entityRefsByStatusDefinitionId = new Map<string, Set<string>>();
  const openCycleIds: string[] = [];

  for (const initiative of domain.initiativesById.values()) {
    indexEntityLabels(entityRefsByLabelId, { kind: "initiative", value: initiative });
  }

  for (const project of domain.projectsById.values()) {
    addIndexValue(projectsByInitiativeId, project.initiativeId, project.id);
    addIndexValue(entityRefsByStatusDefinitionId, project.statusDefinitionId, project.id);
    indexEntityLabels(entityRefsByLabelId, { kind: "project", value: project });
  }

  for (const milestone of domain.milestonesById.values()) {
    addIndexValue(milestonesByProjectId, milestone.projectId, milestone.id);
  }

  for (const issue of domain.issuesById.values()) {
    addIndexValue(issuesByProjectId, issue.projectId, issue.id);
    addIndexValue(issuesByMilestoneId, issue.milestoneId, issue.id);
    indexEntityLabels(entityRefsByLabelId, { kind: "issue", value: issue });
    if (issue.context === "workflow") {
      addIndexValue(entityRefsByStatusDefinitionId, issue.statusDefinitionId, issue.id);
    }
  }

  for (const cycle of domain.cyclesById.values()) {
    if (isTrailCycleOpen(cycle)) openCycleIds.push(cycle.id);
    for (const issueId of cycle.issueIds) {
      addIndexValue(issuesByCycleId, cycle.id, issueId);
      addIndexValue(cyclesByIssueId, issueId, cycle.id);
    }
  }

  openCycleIds.sort();
  return {
    currentCycleId: openCycleIds.length === 1 ? openCycleIds[0] : undefined,
    cyclesByIssueId: finalizeIndex(cyclesByIssueId),
    entityRefsByLabelId: finalizeIndex(entityRefsByLabelId),
    entityRefsByStatusDefinitionId: finalizeIndex(entityRefsByStatusDefinitionId),
    issuesByCycleId: finalizeIndex(issuesByCycleId),
    issuesByMilestoneId: finalizeIndex(issuesByMilestoneId),
    issuesByProjectId: finalizeIndex(issuesByProjectId),
    milestonesByProjectId: finalizeIndex(milestonesByProjectId),
    projectsByInitiativeId: finalizeIndex(projectsByInitiativeId),
  };
}
