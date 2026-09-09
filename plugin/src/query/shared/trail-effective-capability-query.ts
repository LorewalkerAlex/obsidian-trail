import {
  canTrailProjectAssignWorkflowIssueMilestone,
  canTrailProjectChangeWorkflowIssueStatus,
  canTrailProjectDeleteWorkflowIssue,
  canTrailProjectEditWorkflowIssuePlanningFields,
} from "../../domain/rules/trail-project-rules";
import { resolveTrailStatusDefinition } from "../../domain/rules/trail-status-rules";
import {
  isTrailRuntimeWritable,
  type TrailRuntimeControl,
} from "../../runtime/control/trail-runtime-control";
import type { TrailEffectiveRuntimeSnapshot } from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "./trail-effective-query";
import { selectTrailWorkflowIssueMoveProjectIdsFromReadableSnapshot } from "./trail-project-target-query";
import { selectTrailStatusOptionGroups } from "./trail-status-query";

export interface TrailWorkflowIssueEffectiveCapabilities {
  readonly canAssignMilestone: boolean;
  readonly canCancel: boolean;
  readonly canChangeStatus: boolean;
  readonly canDelete: boolean;
  readonly canEditPlanningFields: boolean;
  readonly canMoveOut: boolean;
}

export interface TrailWorkflowIssueLegalTargets {
  readonly moveProjectIds: readonly string[];
  readonly statusDefinitionIds: readonly string[];
}

export interface TrailWorkflowIssueEffectiveCapabilityProjection {
  readonly capabilities: TrailWorkflowIssueEffectiveCapabilities;
  readonly legalTargets: TrailWorkflowIssueLegalTargets;
}

function disabledTrailWorkflowIssueCapabilityProjection(): TrailWorkflowIssueEffectiveCapabilityProjection {
  return {
    capabilities: {
      canAssignMilestone: false,
      canCancel: false,
      canChangeStatus: false,
      canDelete: false,
      canEditPlanningFields: false,
      canMoveOut: false,
    },
    legalTargets: {
      moveProjectIds: [],
      statusDefinitionIds: [],
    },
  };
}

/**
 * Projects one Workflow Issue's effective mutation capability from the same
 * lifecycle rules enforced by Domain planning. Control health participates in
 * availability so read-only fallback snapshots never expose write affordances.
 */
export function selectTrailWorkflowIssueEffectiveCapabilitiesFromReadableSnapshot(
  readable: TrailEffectiveRuntimeSnapshot,
  control: TrailRuntimeControl,
  issueId: string,
): TrailWorkflowIssueEffectiveCapabilityProjection | null {
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const issue = readable.authoritative.domain.issuesById.get(issueId);
  if (issue?.context !== "workflow") return null;
  const project = readable.authoritative.domain.projectsById.get(issue.projectId);
  if (project === undefined) return null;

  const issueStatus = resolveTrailStatusDefinition(
    configuration,
    "issue",
    issue.statusDefinitionId,
  );
  const projectStatus = resolveTrailStatusDefinition(
    configuration,
    "project",
    project.statusDefinitionId,
  );
  if (issueStatus === undefined || projectStatus === undefined) return null;
  if (!isTrailRuntimeWritable(control)) {
    return disabledTrailWorkflowIssueCapabilityProjection();
  }

  const legalStatusTargets = selectTrailStatusOptionGroups(configuration, "issue")
    .flatMap((group) => group.definitions)
    .filter((targetStatus) => (
      targetStatus.id !== issueStatus.id
      && canTrailProjectChangeWorkflowIssueStatus(projectStatus, issueStatus, targetStatus)
    ));
  const moveProjectIds = selectTrailWorkflowIssueMoveProjectIdsFromReadableSnapshot(
    readable,
    issue.id,
  ).filter((targetProjectId) => targetProjectId !== issue.projectId);

  return {
    capabilities: {
      canAssignMilestone: canTrailProjectAssignWorkflowIssueMilestone(projectStatus, issueStatus),
      canCancel: legalStatusTargets.some((targetStatus) => targetStatus.category === "canceled"),
      canChangeStatus: legalStatusTargets.length > 0,
      canDelete: canTrailProjectDeleteWorkflowIssue(projectStatus, issueStatus),
      canEditPlanningFields: canTrailProjectEditWorkflowIssuePlanningFields(
        projectStatus,
        issueStatus,
      ),
      canMoveOut: moveProjectIds.length > 0,
    },
    legalTargets: {
      moveProjectIds,
      statusDefinitionIds: legalStatusTargets.map((targetStatus) => targetStatus.id),
    },
  };
}

export function selectTrailWorkflowIssueEffectiveCapabilities(
  state: TrailRuntimeState,
  issueId: string,
): TrailWorkflowIssueEffectiveCapabilityProjection | null {
  return selectTrailWorkflowIssueEffectiveCapabilitiesFromReadableSnapshot(
    selectTrailReadableRuntimeSnapshot(state),
    state.control,
    issueId,
  );
}
