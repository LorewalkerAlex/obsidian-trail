import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailWorkflowIssueCard } from "./trail-workflow-issue-card";

describe("TrailWorkflowIssueCard", () => {
  it("keeps Board detail sparse while preserving passive Priority, Label, Estimate, and Due signals", () => {
    const { container } = render(
      <TrailWorkflowIssueCard
        due={Date.UTC(2026, 8, 18, 9)}
        estimate="large"
        inCurrentCycle
        issueId="issue-a"
        labels={[
          { groupId: "group-a", id: "label-a", name: "Design" },
          { groupId: "group-a", id: "label-b", name: "Navigation" },
        ]}
        milestoneTitle="Workspace pass"
        priority="urgent"
        timezone="UTC"
        title="Build the Project board"
      />,
    );

    expect(screen.getByText("Build the Project board")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Urgent priority" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Labels: Design, Navigation" })).toHaveTextContent("Design +1");
    expect(screen.getByLabelText("Large estimate")).toHaveTextContent("L");
    expect(screen.getByLabelText("September 18, 2026")).toBeInTheDocument();
    expect(screen.queryByText("Workspace pass")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("In current cycle")).not.toBeInTheDocument();
    expect(container.querySelector(".trail-workflow-issue-card__heading .trail-priority-glyph"))
      .toBeNull();
    expect(container.querySelectorAll(".trail-workflow-issue-card__property")).toHaveLength(2);
    expect(container.querySelectorAll(".trail-workflow-issue-card__fact")).toHaveLength(2);
    expect(container.querySelector(".trail-status-glyph")).toBeNull();
    expect(container.querySelector("[data-workflow-issue-drag-handle='true']"))
      .not.toBeNull();
    expect(container.querySelector(".trail-workflow-issue-card__metadata button")).toBeNull();
  });

  it("keeps passive Board properties inside ordinary Card activation while separating selection and shortcuts", () => {
    const onActivate = vi.fn();
    const onPreviewToggle = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <TrailWorkflowIssueCard
        issueId="issue-a"
        labels={[{ groupId: "group-a", id: "label-a", name: "Design" }]}
        onActivate={onActivate}
        onPreviewToggle={onPreviewToggle}
        onSelectionChange={onSelectionChange}
        priority="high"
        timezone="UTC"
        title="Interactive card"
      />,
    );
    const card = container.querySelector<HTMLElement>("[data-workflow-issue-card='true']");
    expect(card).not.toBeNull();
    if (card === null) return;

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Interactive card" }), {
      shiftKey: true,
    });
    expect(onSelectionChange).toHaveBeenCalledWith(true, true);
    expect(onActivate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Interactive card"));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(card).toHaveFocus();

    fireEvent.click(screen.getByRole("img", { name: "Labels: Design" }));
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(card).toHaveFocus();

    fireEvent.keyDown(card, { key: " " });
    expect(onPreviewToggle).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: "x" });
    expect(onSelectionChange).toHaveBeenLastCalledWith(true, false);

    const checkbox = screen.getByRole("checkbox", { name: "Select Interactive card" });
    checkbox.focus();
    fireEvent.keyDown(checkbox, { key: " " });
    expect(onPreviewToggle).toHaveBeenCalledTimes(1);
  });
});
