import {
  isTrailEpochMilliseconds,
  isTrailPriority,
  isValidTrailTitle,
  normalizeTrailTitle,
  sameTrailStringArray,
  type TrailPriority,
} from "./trail-issue";

/** Formal Project facts used by the first Workflow vertical slice. */
export interface TrailProject {
  readonly description?: string;
  readonly due?: number;
  readonly id: string;
  readonly initiativeId?: string;
  readonly labelIds: readonly string[];
  readonly priority?: TrailPriority;
  readonly statusDefinitionId: string;
  readonly title: string;
}

export function sameTrailProject(
  left: TrailProject,
  right: TrailProject,
): boolean {
  return (
    left.id === right.id
    && left.title === right.title
    && left.description === right.description
    && left.statusDefinitionId === right.statusDefinitionId
    && left.initiativeId === right.initiativeId
    && left.priority === right.priority
    && left.due === right.due
    && sameTrailStringArray(left.labelIds, right.labelIds)
  );
}

/** Validates only Project-local field carriers; Configuration references are separate. */
export function validateTrailProjectFields(project: TrailProject): readonly string[] {
  const issues: string[] = [];

  if (project.id.trim() === "") {
    issues.push("Project id must be non-empty text");
  }
  if (!isValidTrailTitle(normalizeTrailTitle(project.title))) {
    issues.push("Project title must be non-empty single-line text");
  }
  if (project.statusDefinitionId.trim() === "") {
    issues.push("Project statusDefinitionId must be non-empty text");
  }
  if (project.priority !== undefined && !isTrailPriority(project.priority)) {
    issues.push("Project priority is invalid");
  }
  if (project.due !== undefined && !isTrailEpochMilliseconds(project.due)) {
    issues.push("Project due must be a valid timestamp when present");
  }

  return issues;
}
