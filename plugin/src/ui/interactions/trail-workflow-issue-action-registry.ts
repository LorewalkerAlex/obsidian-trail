import type { TrailIssueApplication } from "../../application/issues/trail-issue-application";
import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  selectTrailWorkflowIssueActionFacts,
  type TrailWorkflowIssueActionFactsReadModel,
  type TrailWorkflowIssueActionNamedTargetReadModel,
} from "../../query/shared/trail-workflow-issue-action-query";

export const TRAIL_WORKFLOW_ISSUE_ACTION_IDS = [
  "issue.move-project",
  "issue.cancel",
  "issue.delete",
] as const;

export type TrailWorkflowIssueActionId = (typeof TRAIL_WORKFLOW_ISSUE_ACTION_IDS)[number];
export type TrailWorkflowIssueActionGroup = "destructive" | "relationship-lifecycle";
export type TrailWorkflowIssueActionIntents = Pick<
  TrailIssueApplication,
  "changeStatus" | "delete" | "moveToProject"
>;

export interface TrailWorkflowIssueActionTarget {
  readonly id: string;
  readonly label: string;
}

export interface TrailWorkflowIssueResolvedAction {
  readonly group: TrailWorkflowIssueActionGroup;
  readonly id: TrailWorkflowIssueActionId;
  readonly label: string;
  readonly targets: readonly TrailWorkflowIssueActionTarget[];
}

export interface TrailWorkflowIssueActionContext {
  readonly actions: readonly TrailWorkflowIssueResolvedAction[];
  readonly issueIds: readonly string[];
  readonly issues: readonly TrailWorkflowIssue[];
  readonly unavailableReason?: string;
}

export type TrailWorkflowIssueActionScopeSource = "context-menu" | "explicit";

export interface TrailWorkflowIssueActionScopeInput {
  readonly invokedIssueId: string;
  readonly selectedIssueIds: ReadonlySet<string>;
  readonly source: TrailWorkflowIssueActionScopeSource;
}

function uniqueIds(ids: Iterable<string>): readonly string[] {
  return [...new Set(ids)];
}

/**
 * Right-click on a selected Issue addresses the retained selection. Right-click
 * on an unselected Issue addresses only that Issue. Explicit local affordances
 * such as Peek overflow always stay entity-local and never consume selection.
 */
export function resolveTrailWorkflowIssueActionScope(
  input: TrailWorkflowIssueActionScopeInput,
): readonly string[] {
  if (
    input.source === "context-menu"
    && input.selectedIssueIds.has(input.invokedIssueId)
  ) {
    return uniqueIds(input.selectedIssueIds);
  }
  return [input.invokedIssueId];
}

export function resolveTrailWorkflowIssueBulkActionScope(
  selectedIssueIds: ReadonlySet<string>,
): readonly string[] {
  return uniqueIds(selectedIssueIds);
}

function intersectTargets(
  issues: readonly TrailWorkflowIssueActionFactsReadModel[],
  selectTargets: (
    issue: TrailWorkflowIssueActionFactsReadModel,
  ) => readonly TrailWorkflowIssueActionNamedTargetReadModel[],
): readonly TrailWorkflowIssueActionTarget[] {
  const first = issues[0];
  if (first === undefined) return [];
  const remainingTargetIds = issues.slice(1).map((issue) => (
    new Set(selectTargets(issue).map((target) => target.id))
  ));
  return selectTargets(first)
    .filter((target) => remainingTargetIds.every((targetIds) => targetIds.has(target.id)))
    .map((target) => ({ id: target.id, label: target.label }));
}

function resolveDefaultCancelTarget(
  issues: readonly TrailWorkflowIssueActionFactsReadModel[],
): TrailWorkflowIssueActionTarget | undefined {
  if (issues.length === 0 || issues.some((issue) => !issue.capabilities.canCancel)) {
    return undefined;
  }
  const firstTarget = issues[0]?.legalTargets.statuses.find((target) => (
    target.category === "canceled" && target.isDefault
  ));
  if (firstTarget === undefined) return undefined;
  if (issues.slice(1).some((issue) => !issue.legalTargets.statuses.some((target) => (
    target.id === firstTarget.id
  )))) {
    return undefined;
  }
  return { id: firstTarget.id, label: firstTarget.label };
}

function unavailableReason(controlKind: string): string | undefined {
  switch (controlKind) {
    case "loading":
      return "Actions are unavailable while Trail is loading.";
    case "refreshing":
      return "Actions are unavailable while Trail is refreshing.";
    case "read-only-error":
      return "Actions are unavailable while Trail is read-only.";
    default:
      return undefined;
  }
}

/**
 * Resolves common legal actions for one entity or a multi-selection. Bulk action
 * legality is an intersection over the same per-Issue Query facts; there is no
 * separate bulk capability matrix.
 */
export function resolveTrailWorkflowIssueActionContext(
  state: TrailRuntimeState,
  issueIds: readonly string[],
): TrailWorkflowIssueActionContext | null {
  const normalizedIssueIds = uniqueIds(issueIds);
  if (normalizedIssueIds.length === 0) return null;

  const facts = selectTrailWorkflowIssueActionFacts(state, normalizedIssueIds);
  if (facts === null) return null;
  const issues = facts.issues;
  const reason = unavailableReason(facts.controlKind);
  if (reason !== undefined) {
    return {
      actions: [],
      issueIds: normalizedIssueIds,
      issues: issues.map(({ expectedIssue }) => expectedIssue),
      unavailableReason: reason,
    };
  }

  const actions: TrailWorkflowIssueResolvedAction[] = [];
  const moveTargets = issues.every((issue) => issue.capabilities.canMoveOut)
    ? intersectTargets(issues, (issue) => issue.legalTargets.moveProjects)
    : [];
  if (moveTargets.length > 0) {
    actions.push({
      group: "relationship-lifecycle",
      id: "issue.move-project",
      label: "Move to project",
      targets: moveTargets,
    });
  }

  const cancelTarget = resolveDefaultCancelTarget(issues);
  if (cancelTarget !== undefined) {
    actions.push({
      group: "relationship-lifecycle",
      id: "issue.cancel",
      label: "Cancel",
      targets: [cancelTarget],
    });
  }

  if (issues.every((issue) => issue.capabilities.canDelete)) {
    actions.push({
      group: "destructive",
      id: "issue.delete",
      label: "Delete",
      targets: [],
    });
  }

  return {
    actions,
    issueIds: normalizedIssueIds,
    issues: issues.map(({ expectedIssue }) => expectedIssue),
  };
}

function requireResolvedAction(
  context: TrailWorkflowIssueActionContext,
  actionId: TrailWorkflowIssueActionId,
  targetId: string | undefined,
): {
  readonly action: TrailWorkflowIssueResolvedAction;
  readonly target?: TrailWorkflowIssueActionTarget;
} {
  const action = context.actions.find((candidate) => candidate.id === actionId);
  if (action === undefined) {
    throw new Error(`Workflow Issue action is not available: ${actionId}`);
  }
  if (action.targets.length === 0) {
    if (targetId !== undefined) {
      throw new Error(`Workflow Issue action does not accept a target: ${actionId}`);
    }
    return { action };
  }
  if (targetId === undefined) {
    throw new Error(`Workflow Issue action requires a target: ${actionId}`);
  }
  const target = action.targets.find((candidate) => candidate.id === targetId);
  if (target === undefined) {
    throw new Error(`Workflow Issue action target is not available: ${actionId} -> ${targetId}`);
  }
  return { action, target };
}

function collectActionResultCompletion(
  result: ReturnType<TrailWorkflowIssueActionIntents["changeStatus"]>,
  completions: Promise<void>[],
): void {
  switch (result.kind) {
    case "submitted":
      completions.push(result.receipt.completion);
      return;
    case "unchanged":
      return;
    case "needs-input":
      throw new Error(result.input.message);
  }
}

/** Dispatches the resolved stable Action ID to the existing Application intent. */
export async function executeTrailWorkflowIssueAction(
  intents: TrailWorkflowIssueActionIntents,
  context: TrailWorkflowIssueActionContext,
  actionId: TrailWorkflowIssueActionId,
  targetId?: string,
): Promise<void> {
  const { action, target } = requireResolvedAction(context, actionId, targetId);
  const completions: Promise<void>[] = [];

  for (const issue of context.issues) {
    switch (action.id) {
      case "issue.move-project":
        if (target === undefined) throw new Error("Move action target is missing");
        collectActionResultCompletion(
          intents.moveToProject(issue, target.id),
          completions,
        );
        break;
      case "issue.cancel":
        if (target === undefined) throw new Error("Cancel action target is missing");
        collectActionResultCompletion(
          intents.changeStatus(issue, target.id),
          completions,
        );
        break;
      case "issue.delete":
        completions.push(intents.delete(issue).completion);
        break;
    }
  }

  await Promise.all(completions);
}
