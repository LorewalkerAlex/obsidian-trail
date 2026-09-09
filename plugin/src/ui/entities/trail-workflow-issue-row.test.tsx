import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailWorkflowIssueRow } from "./trail-workflow-issue-row";

describe("TrailWorkflowIssueRow", () => {
  it("keeps Priority before the Status + Title identity while planning facts occupy stable soft columns", () => {
    const { container } = render(
      <TrailWorkflowIssueRow
        due={Date.UTC(2026, 8, 18, 9)}
        estimate="large"
        inCurrentCycle
        labels={[{ groupId: "group-a", id: "label-a", name: "Design" }]}
        milestoneTitle="Workspace pass"
        priority="urgent"
        statusCategory="started"
        statusLabel="In Progress"
        timezone="UTC"
        title="Establish workspace page composition"
      />,
    );

    expect(screen.getByText("Establish workspace page composition")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "In Progress status" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Urgent priority" })).toBeInTheDocument();
    expect(screen.getByText("Workspace pass")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Labels: Design" })).toBeInTheDocument();
    expect(screen.getByLabelText("In current cycle")).toHaveTextContent("Current");
    expect(screen.getByLabelText("Large estimate")).toHaveTextContent("L");
    expect(screen.getByLabelText("September 18, 2026")).toBeInTheDocument();

    const content = container.querySelector(".trail-workflow-issue-row__content");
    expect(content?.children).toHaveLength(3);
    expect(content?.children[0]).toHaveClass("trail-workflow-issue-row__priority");
    expect(content?.children[1]).toHaveClass("trail-workflow-issue-row__identity");
    expect(content?.children[2]).toHaveClass("trail-workflow-issue-row__metadata");
    expect(container.querySelector(".trail-workflow-issue-row__identity .trail-status-glyph"))
      .not.toBeNull();
    expect(container.querySelector(".trail-workflow-issue-row__metadata")?.children)
      .toHaveLength(5);
  });

  it("reserves soft metadata tracks without rendering absent-value placeholders", () => {
    const { container } = render(
      <TrailWorkflowIssueRow
        labels={[]}
        priority={undefined}
        statusCategory="backlog"
        statusLabel="Backlog"
        timezone="UTC"
        title="Backlog planning note"
      />,
    );

    expect(screen.getByText("Backlog planning note")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Backlog status" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "No priority" })).not.toBeInTheDocument();

    for (const className of [
      "trail-workflow-issue-row__priority",
      "trail-workflow-issue-row__milestone",
      "trail-workflow-issue-row__labels",
      "trail-workflow-issue-row__cycle",
      "trail-workflow-issue-row__estimate",
      "trail-workflow-issue-row__due",
    ]) {
      const slot = container.querySelector(`.${className}`);
      expect(slot).not.toBeNull();
      expect(slot).toBeEmptyDOMElement();
    }
  });

  it("separates selection, ordinary activation, and the explicit Space preview toggle", () => {
    const onActivate = vi.fn();
    const onPreviewToggle = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <TrailWorkflowIssueRow
        highlighted
        issueId="issue-a"
        labels={[]}
        onActivate={onActivate}
        onPreviewToggle={onPreviewToggle}
        onSelectionChange={onSelectionChange}
        statusCategory="unstarted"
        statusLabel="Todo"
        timezone="UTC"
        title="Preview this issue"
      />,
    );
    const row = container.querySelector<HTMLDivElement>("[data-workflow-issue-row='true']");
    expect(row).not.toBeNull();
    if (row === null) return;

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Preview this issue" }), {
      shiftKey: true,
    });
    expect(onSelectionChange).toHaveBeenCalledWith(true, true);
    expect(onActivate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Preview this issue"));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onPreviewToggle).not.toHaveBeenCalled();

    fireEvent.keyDown(row, { key: " " });
    expect(onPreviewToggle).toHaveBeenCalledTimes(1);
    expect(row).toHaveAttribute("data-highlighted", "true");

    fireEvent.keyDown(row, { key: "x" });
    expect(onSelectionChange).toHaveBeenLastCalledWith(true, false);
  });

  it("keeps the selection gutter visible for a selected Issue without changing semantic Status", () => {
    const { container } = render(
      <TrailWorkflowIssueRow
        labels={[]}
        onSelectionChange={vi.fn()}
        selected
        statusCategory="completed"
        statusLabel="Done"
        timezone="UTC"
        title="Selected issue"
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Deselect Selected issue" })).toBeChecked();
    expect(container.querySelector("[data-workflow-issue-row='true']"))
      .toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("img", { name: "Done status" })).toBeInTheDocument();
  });
});
