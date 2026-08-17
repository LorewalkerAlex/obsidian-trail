import type { TrailConfiguration } from "../model/trail-configuration";
import type {
  TrailCycle,
  TrailInitiative,
  TrailIssue,
  TrailMilestone,
  TrailProject,
} from "../model/trail-entities";
import type { TrailWorkspaceState } from "../model/trail-workspace-state";

export interface TrailPlanningDomainState {
  readonly cyclesById: ReadonlyMap<string, TrailCycle>;
  readonly initiativesById: ReadonlyMap<string, TrailInitiative>;
  readonly issuesById: ReadonlyMap<string, TrailIssue>;
  readonly milestonesById: ReadonlyMap<string, TrailMilestone>;
  readonly projectsById: ReadonlyMap<string, TrailProject>;
}

export interface TrailPlanningState {
  readonly configuration: TrailConfiguration;
  readonly domain: TrailPlanningDomainState;
  readonly workspaceState: TrailWorkspaceState;
}

export function trailPlanningEntityExists(
  domain: TrailPlanningDomainState,
  entityId: string,
): boolean {
  return domain.initiativesById.has(entityId)
    || domain.projectsById.has(entityId)
    || domain.milestonesById.has(entityId)
    || domain.issuesById.has(entityId)
    || domain.cyclesById.has(entityId);
}
