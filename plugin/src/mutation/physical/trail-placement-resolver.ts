import {
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_PATH,
} from "../../markdown/schema/trail-physical-schema";
import type { TrailCommittedRuntime } from "../../runtime/store/trail-runtime-store";
import {
  trailMutationEntityId,
  type TrailMutationEntity,
} from "../plans/trail-mutation-plan";

export type TrailInitiativePathAllocator = (
  initiative: Extract<TrailMutationEntity, { kind: "initiative" }>["value"],
) => Promise<string>;

export type TrailProjectPathAllocator = (
  project: Extract<TrailMutationEntity, { kind: "project" }>["value"],
) => Promise<string>;

export interface TrailPlacementEnvironment {
  readonly allocateInitiativePath?: TrailInitiativePathAllocator;
  readonly allocateProjectPath?: TrailProjectPathAllocator;
}

function requireProjectSource(
  projectId: string,
  committed: TrailCommittedRuntime,
  label: string,
): string {
  const projectPath = committed.sourceByEntityId[projectId];
  if (projectPath === undefined) {
    throw new Error(`${label} Project source is not committed: ${projectId}`);
  }
  return projectPath;
}

/** Resolves logical entity placement from committed ownership and frozen physical rules. */
export async function resolveTrailEntityPlacement(
  entity: TrailMutationEntity,
  committed: TrailCommittedRuntime,
  environment: TrailPlacementEnvironment = {},
): Promise<string> {
  const existing = committed.sourceByEntityId[trailMutationEntityId(entity)];
  if (existing !== undefined) return existing;

  switch (entity.kind) {
    case "initiative":
      if (environment.allocateInitiativePath === undefined) {
        throw new Error("Initiative placement requires a file-backed path allocator");
      }
      return environment.allocateInitiativePath(entity.value);
    case "project":
      if (environment.allocateProjectPath === undefined) {
        throw new Error("Project placement requires a file-backed path allocator");
      }
      return environment.allocateProjectPath(entity.value);
    case "milestone":
      return requireProjectSource(entity.value.projectId, committed, "Milestone");
    case "triage-issue":
      return TRAIL_TRIAGE_PATH;
    case "workflow-issue": {
      const projectId = entity.value.projectId;
      if (projectId === undefined) return TRAIL_PROJECTLESS_ISSUES_PATH;
      return requireProjectSource(projectId, committed, "Workflow Issue");
    }
    case "cycle":
      return TRAIL_CYCLES_PATH;
  }
}
