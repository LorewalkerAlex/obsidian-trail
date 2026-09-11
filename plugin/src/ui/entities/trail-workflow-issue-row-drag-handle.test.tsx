import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailWorkflowIssueRow } from "./trail-workflow-issue-row";

describe("TrailWorkflowIssueRow Status drag handle", () => {
  it("keeps the selection control outside the draggable Issue content", () => {
    const { container } = render(
      <TrailWorkflowIssueRow
        issueId="issue-a"
        labels={[]}
        onSelectionChange={vi.fn()}
        statusCategory="started"
        statusLabel="In Progress"
        timezone="UTC"
        title="Draggable row"
      />,
    );

    const handle = container.querySelector("[data-workflow-issue-drag-handle='true']");
    const checkbox = screen.getByRole("checkbox", { name: "Select Draggable row" });
    expect(handle).not.toBeNull();
    expect(handle?.contains(checkbox)).toBe(false);
  });
});
