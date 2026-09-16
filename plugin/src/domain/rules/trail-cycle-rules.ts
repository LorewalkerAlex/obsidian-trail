import type { TrailConfiguration } from "../model/trail-configuration";
import type { TrailCycle, TrailIssue } from "../model/trail-entities";
import {
  isTrailTerminalStatusDefinition,
  resolveTrailStatusDefinition,
} from "./trail-status-rules";

export function isTrailCycleOpen(cycle: TrailCycle): boolean {
  return cycle.endedAt === undefined;
}

/** Returns the single open Cycle when the validated graph has one. */
export function findTrailOpenCycle(cycles: Iterable<TrailCycle>): TrailCycle | undefined {
  for (const cycle of cycles) {
    if (isTrailCycleOpen(cycle)) return cycle;
  }
  return undefined;
}

/**
 * Resolves the initially selected Issues for the explicit Close-and-start-next flow.
 * Membership has set semantics, so the result is stable ID order rather than source order.
 */
export function resolveTrailNextCycleCandidateIssueIds(
  configuration: TrailConfiguration,
  sourceCycle: TrailCycle,
  issuesById: ReadonlyMap<string, TrailIssue>,
): readonly string[] {
  if (!isTrailCycleOpen(sourceCycle)) {
    throw new Error("Next-cycle candidates require an open Cycle");
  }

  const candidates: string[] = [];
  for (const issueId of sourceCycle.issueIds) {
    const issue = issuesById.get(issueId);
    if (issue === undefined) {
      throw new Error(`Cycle references a missing Issue: ${issueId}`);
    }
    if (issue.context !== "workflow") {
      throw new Error(`Cycle references a Triage Issue: ${issueId}`);
    }
    const status = resolveTrailStatusDefinition(
      configuration,
      "issue",
      issue.statusDefinitionId,
    );
    if (status === undefined) {
      throw new Error(`Workflow Issue has an invalid StatusDefinition: ${issueId}`);
    }
    if (!isTrailTerminalStatusDefinition(status)) candidates.push(issue.id);
  }
  return candidates.sort();
}
