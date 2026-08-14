import {
  createTrailSequencedEntityPath,
  readTrailEntityFileSequence,
  TRAIL_PROJECTS_PATH,
} from "../../markdown/schema/trail-physical-schema";
import type { TrailProject } from "../../domain/trail-project";
import type { TrailSourceEntry } from "../../persistence/ports/trail-source-io";
import type { TrailProjectPathAllocator } from "./trail-placement-resolver";

export type TrailProjectSourceLister = () => Promise<readonly TrailSourceEntry[]>;

/** Allocates the next readable Project path without persisting allocator state. */
export function createTrailProjectPathAllocator(
  listProjectSources: TrailProjectSourceLister,
): TrailProjectPathAllocator {
  return async (project: TrailProject): Promise<string> => {
    const entries = await listProjectSources();
    let maxSequence = 0;
    for (const entry of entries) {
      if (entry.kind !== "file") continue;
      const sequence = readTrailEntityFileSequence(entry.name);
      if (sequence !== undefined) maxSequence = Math.max(maxSequence, sequence);
    }
    const nextSequence = maxSequence + 1;
    if (nextSequence > 9999) {
      throw new Error("Project physical sequence exhausted the four-digit namespace");
    }
    return createTrailSequencedEntityPath(
      TRAIL_PROJECTS_PATH,
      nextSequence,
      project.title,
      "Project",
    );
  };
}
