import {
  sameTrailWorkflowIssue,
  type TrailWorkflowIssue,
} from "./trail-issue";
import {
  parseProjectMarkdown,
  ProjectMarkdownMutationError,
  type ParseProjectMarkdownInput,
} from "./trail-project-markdown";

export interface DeleteWorkflowIssueFromProjectMarkdownInput
  extends ParseProjectMarkdownInput {
  readonly expectedIssue: TrailWorkflowIssue;
}

/** Removes exactly one guarded Workflow Issue from a valid Project snapshot. */
export function deleteWorkflowIssueFromProjectMarkdown(
  input: DeleteWorkflowIssueFromProjectMarkdownInput,
): string {
  const current = parseProjectMarkdown(input);
  if (current.issues.length > 0 || current.contribution === undefined) {
    throw new ProjectMarkdownMutationError(
      "source-invalid",
      "Refused to delete from an invalid Project source",
    );
  }

  const issue = current.contribution.issuesById[input.expectedIssue.id];
  const source = current.contribution.sourceByIssueId[input.expectedIssue.id];
  if (issue === undefined || source === undefined) {
    throw new ProjectMarkdownMutationError(
      "target-missing",
      `Workflow Issue is missing: ${input.expectedIssue.id}`,
    );
  }
  if (!sameTrailWorkflowIssue(issue, input.expectedIssue)) {
    throw new ProjectMarkdownMutationError(
      "conflict",
      `Workflow Issue changed before deletion: ${input.expectedIssue.id}`,
    );
  }

  const next = [
    input.markdown.slice(0, source.startOffset),
    input.markdown.slice(source.endOffset),
  ].join("");
  const verified = parseProjectMarkdown({
    filePath: input.filePath,
    markdown: next,
    parseYaml: input.parseYaml,
  });
  if (
    verified.issues.length > 0
    || verified.contribution === undefined
    || verified.contribution.issuesById[input.expectedIssue.id] !== undefined
  ) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Generated Workflow Issue deletion failed verification",
    );
  }
  return next;
}
