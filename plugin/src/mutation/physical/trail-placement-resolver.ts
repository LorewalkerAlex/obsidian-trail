import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import {
  TRAIL_CYCLES_PATH,
  TRAIL_TRIAGE_PATH,
} from "../../markdown/schema/trail-paths";
import type { TrailDomainSourceRepository, TrailManagedDomainSourceKind } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailCommittedRuntime } from "../../runtime/store/trail-runtime-store";
import {
  allocateTrailFileBackedEntityPath,
  projectTrailRenamedFileBackedPath,
} from "./trail-file-backed-path-allocator";

export interface TrailEntityPlacement {
  readonly path: string;
  readonly renameFrom?: string;
  readonly sourceKind: TrailManagedDomainSourceKind;
}

function requiredOwner(committed: TrailCommittedRuntime, entityId: string, label: string): string {
  const path = committed.ownership.sourceByEntityId.get(entityId);
  if (path === undefined) throw new Error(`${label} has no authoritative source ownership: ${entityId}`);
  return path;
}

function requiredWorkflowProjectId(entity: Extract<TrailDomainEntity, { readonly kind: "issue" }>): string {
  if (entity.value.context !== "workflow") {
    throw new Error("Workflow Project resolution requires a Workflow Issue");
  }
  if (entity.value.projectId === undefined) {
    throw new Error("Workflow Issue requires a Project for physical placement");
  }
  return entity.value.projectId;
}

/** Resolves desired placement from current logical relationships, not from Markdown layout. */
export async function resolveTrailDesiredEntityPlacement(
  entity: TrailDomainEntity,
  committed: TrailCommittedRuntime,
  repository: Pick<TrailDomainSourceRepository, "list">,
): Promise<TrailEntityPlacement> {
  switch (entity.kind) {
    case "initiative": {
      const current = committed.ownership.sourceByEntityId.get(entity.value.id);
      if (current === undefined) {
        return {
          path: await allocateTrailFileBackedEntityPath(repository, "initiative", entity.value.title),
          sourceKind: "initiative",
        };
      }
      const projected = projectTrailRenamedFileBackedPath(current, "initiative", entity.value.title);
      return {
        path: projected,
        renameFrom: projected === current ? undefined : current,
        sourceKind: "initiative",
      };
    }
    case "project": {
      const current = committed.ownership.sourceByEntityId.get(entity.value.id);
      if (current === undefined) {
        return {
          path: await allocateTrailFileBackedEntityPath(repository, "project", entity.value.title),
          sourceKind: "project",
        };
      }
      const projected = projectTrailRenamedFileBackedPath(current, "project", entity.value.title);
      return {
        path: projected,
        renameFrom: projected === current ? undefined : current,
        sourceKind: "project",
      };
    }
    case "milestone":
      return {
        path: requiredOwner(committed, entity.value.projectId, "Milestone Project"),
        sourceKind: "project",
      };
    case "issue":
      if (entity.value.context === "triage") {
        return { path: TRAIL_TRIAGE_PATH, sourceKind: "triage" };
      }
      return {
        path: requiredOwner(
          committed,
          requiredWorkflowProjectId(entity),
          "Workflow Issue Project",
        ),
        sourceKind: "project",
      };
    case "cycle":
      return { path: TRAIL_CYCLES_PATH, sourceKind: "cycles" };
  }
}

export function resolveTrailCurrentEntityPlacement(
  entity: TrailDomainEntity,
  committed: TrailCommittedRuntime,
): TrailEntityPlacement {
  const path = requiredOwner(committed, entity.value.id, "Entity");
  switch (entity.kind) {
    case "initiative": return { path, sourceKind: "initiative" };
    case "project": return { path, sourceKind: "project" };
    case "milestone": return { path, sourceKind: "project" };
    case "issue": {
      if (entity.value.context === "triage") return { path, sourceKind: "triage" };
      requiredWorkflowProjectId(entity);
      return { path, sourceKind: "project" };
    }
    case "cycle": return { path, sourceKind: "cycles" };
  }
}
