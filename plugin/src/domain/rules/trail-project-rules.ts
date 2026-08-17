import type { TrailConfiguration, TrailStatusDefinition } from "../model/trail-configuration";
import type { TrailIssue, TrailWorkflowIssue } from "../model/trail-entities";
import {
  isTrailTerminalStatusDefinition,
  resolveTrailStatusDefinition,
} from "./trail-status-rules";

/** Terminal Projects may receive terminal history, but not new non-terminal work. */
export function canTrailProjectAcceptWorkflowIssue(
  projectStatus: TrailStatusDefinition,
  issueStatus: TrailStatusDefinition,
): boolean {
  return isTrailTerminalStatusDefinition(issueStatus)
    || !isTrailTerminalStatusDefinition(projectStatus);
}

/** Returns the first current non-terminal Workflow Issue owned by a Project. */
export function findTrailNonTerminalProjectChildIssue(
  configuration: TrailConfiguration,
  issues: Iterable<TrailIssue>,
  projectId: string,
): TrailWorkflowIssue | undefined {
  for (const candidate of issues) {
    if (candidate.context !== "workflow" || candidate.projectId !== projectId) continue;
    const status = resolveTrailStatusDefinition(
      configuration,
      "issue",
      candidate.statusDefinitionId,
    );
    if (status !== undefined && !isTrailTerminalStatusDefinition(status)) return candidate;
  }
  return undefined;
}