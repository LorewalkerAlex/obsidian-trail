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
 * Resolves the initially selected Issues for the explicit Create Next Cycle flow.
 * Membership has set semantics, so the result is stable ID order rather than history order.
 */
export function resolveTrailNextCycleCandidateIssueIds(
  configuration: TrailConfiguration,
  closedCycle: TrailCycle,
  issuesById: ReadonlyMap<string, TrailIssue>,
): readonly string[] {
  if (isTrailCycleOpen(closedCycle)) {
    throw new Error("Next-cycle candidates require a closed Cycle");
  }

  const candidates: string[] = [];
  for (const issueId of closedCycle.issueIds) {
    const issue = issuesById.get(issueId);
    if (issue === undefined) {
      throw new Error(`Closed Cycle references a missing Issue: ${issueId}`);
    }
    if (issue.context !== "workflow") {
      throw new Error(`Closed Cycle references a Triage Issue: ${issueId}`);
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
