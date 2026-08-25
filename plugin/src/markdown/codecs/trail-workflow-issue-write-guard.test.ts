import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import { canonicalWorkflowIssueMetadata } from "./trail-codec-support";

function issue(description: string): TrailWorkflowIssue {
  return {
    context: "workflow",
    createdAt: 1,
    description,
    id: "issue-a",
    labelIds: [],
    projectId: "project-a",
    statusDefinitionId: "status-a",
    title: "Issue A",
  };
}

describe("Workflow Issue write body guard", () => {
  it("rejects root H1/H2 headings because they are managed record structure", () => {
    expect(() => canonicalWorkflowIssueMetadata(issue("Notes\n\n## Accidental record")))
      .toThrow("Workflow Issue description must not contain root H1 or H2 headings");
  });

  it("allows ordinary Markdown, H3 headings, and H2-looking text inside a code fence", () => {
    expect(() => canonicalWorkflowIssueMetadata(issue([
      "### Detail",
      "",
      "```markdown",
      "## Example only",
      "```",
    ].join("\n")))).not.toThrow();
  });
});
