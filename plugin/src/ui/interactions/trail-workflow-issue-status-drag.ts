export interface TrailWorkflowIssueStatusDragTarget {
  readonly id: string;
  readonly requiresInput: boolean;
}

export interface TrailWorkflowIssueStatusDragItem {
  readonly id: string;
  readonly statusDefinitionId: string;
  readonly targets: readonly TrailWorkflowIssueStatusDragTarget[];
}

export interface TrailWorkflowIssueStatusDragScope {
  readonly issueIds: readonly string[];
  readonly sourceStatusDefinitionId: string;
  readonly targetStatusDefinitionIds: readonly string[];
}

/**
 * Resolves one Workflow Issue Status-drag scope from the current visible order.
 * Selection participates only when the grabbed Issue is selected and every
 * selected Issue is visible in the same concrete StatusDefinition.
 *
 * Query/Application-facing code supplies target legality and whether a target
 * needs extra per-Issue input. Multi-Issue drag excludes those targets so one
 * gesture cannot intentionally begin a partial group Status change.
 */
export function resolveTrailWorkflowIssueStatusDragScope(input: {
  readonly issues: readonly TrailWorkflowIssueStatusDragItem[];
  readonly selectedIssueIds: ReadonlySet<string>;
  readonly sourceIssueId: string;
}): TrailWorkflowIssueStatusDragScope | null {
  const source = input.issues.find(({ id }) => id === input.sourceIssueId);
  if (source === undefined) return null;

  let scopedIssues: readonly TrailWorkflowIssueStatusDragItem[] = [source];
  if (input.selectedIssueIds.has(input.sourceIssueId)) {
    const selectedIssues = input.issues.filter(({ id }) => input.selectedIssueIds.has(id));
    if (selectedIssues.length !== input.selectedIssueIds.size) return null;
    if (selectedIssues.some(({ statusDefinitionId }) => (
      statusDefinitionId !== source.statusDefinitionId
    ))) return null;
    scopedIssues = selectedIssues;
  }

  const multiIssue = scopedIssues.length > 1;
  const targetStatusDefinitionIds = source.targets
    .filter((target) => (
      target.id !== source.statusDefinitionId
      && (!multiIssue || !target.requiresInput)
      && scopedIssues.every((issue) => issue.targets.some((candidate) => (
        candidate.id === target.id
        && (!multiIssue || !candidate.requiresInput)
      )))
    ))
    .map(({ id }) => id);

  if (targetStatusDefinitionIds.length === 0) return null;
  return {
    issueIds: scopedIssues.map(({ id }) => id),
    sourceStatusDefinitionId: source.statusDefinitionId,
    targetStatusDefinitionIds,
  };
}
