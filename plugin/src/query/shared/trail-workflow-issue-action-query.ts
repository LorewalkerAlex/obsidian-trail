import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type { TrailStatusCategory } from "../../domain/model/trail-values";
import type { TrailRuntimeControl } from "../../runtime/control/trail-runtime-control";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  selectTrailWorkflowIssueEffectiveCapabilitiesFromReadableSnapshot,
  type TrailWorkflowIssueEffectiveCapabilities,
} from "./trail-effective-capability-query";
import { selectTrailReadableRuntimeSnapshot } from "./trail-effective-query";
import { selectTrailStatusDefinition } from "./trail-status-query";

export interface TrailWorkflowIssueActionNamedTargetReadModel {
  readonly id: string;
  readonly label: string;
}

export interface TrailWorkflowIssueActionStatusTargetReadModel
  extends TrailWorkflowIssueActionNamedTargetReadModel {
  readonly category: TrailStatusCategory;
  readonly isDefault: boolean;
}

export interface TrailWorkflowIssueActionFactsReadModel {
  readonly capabilities: TrailWorkflowIssueEffectiveCapabilities;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly legalTargets: {
    readonly moveProjects: readonly TrailWorkflowIssueActionNamedTargetReadModel[];
    readonly statuses: readonly TrailWorkflowIssueActionStatusTargetReadModel[];
  };
}

export interface TrailWorkflowIssueActionFactsCollectionReadModel {
  readonly controlKind: TrailRuntimeControl["kind"];
  readonly issues: readonly TrailWorkflowIssueActionFactsReadModel[];
}

/**
 * Resolves one coherent readable snapshot into the facts Action Registry needs.
 * Query owns target naming and current entity snapshots; UI owns action grouping,
 * scope, presentation, and dispatch.
 */
export function selectTrailWorkflowIssueActionFacts(
  state: TrailRuntimeState,
  issueIds: readonly string[],
): TrailWorkflowIssueActionFactsCollectionReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const issues: TrailWorkflowIssueActionFactsReadModel[] = [];
  for (const issueId of issueIds) {
    const expectedIssue = readable.authoritative.domain.issuesById.get(issueId);
    if (expectedIssue?.context !== "workflow") return null;

    const projection = selectTrailWorkflowIssueEffectiveCapabilitiesFromReadableSnapshot(
      readable,
      state.control,
      issueId,
    );
    if (projection === null) return null;

    const moveProjects: TrailWorkflowIssueActionNamedTargetReadModel[] = [];
    for (const projectId of projection.legalTargets.moveProjectIds) {
      const project = readable.authoritative.domain.projectsById.get(projectId);
      if (project === undefined) return null;
      moveProjects.push({ id: project.id, label: project.title });
    }

    const statuses: TrailWorkflowIssueActionStatusTargetReadModel[] = [];
    for (const statusDefinitionId of projection.legalTargets.statusDefinitionIds) {
      const definition = selectTrailStatusDefinition(
        configuration,
        "issue",
        statusDefinitionId,
      );
      if (definition === undefined) return null;
      statuses.push({
        category: definition.category,
        id: definition.id,
        isDefault: configuration.workflowStatuses.issue[definition.category].defaultId
          === definition.id,
        label: definition.name,
      });
    }

    issues.push({
      capabilities: projection.capabilities,
      expectedIssue,
      legalTargets: { moveProjects, statuses },
    });
  }

  return {
    controlKind: state.control.kind,
    issues,
  };
}
