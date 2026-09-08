import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailWorkflowIssueRow } from "./trail-workflow-issue-row";

describe("TrailWorkflowIssueRow", () => {
  it("keeps Status structural while scanning Priority, planning context, and Due metadata", () => {
    const { container } = render(
      <TrailWorkflowIssueRow
        due={Date.UTC(2026, 8, 18, 9)}
        estimate="large"
        inCurrentCycle
        labels={[{ groupId: "group-a", id: "label-a", name: "Design" }]}
        milestoneTitle="Workspace pass"
        priority="urgent"
        timezone="UTC"
        title="Establish workspace page composition"
      />,
    );

    expect(screen.getByText("Establish workspace page composition")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Urgent priority" })).toBeInTheDocument();
    expect(screen.getByText("Workspace pass")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Labels: Design" })).toBeInTheDocument();
    expect(screen.getByLabelText("In current cycle")).toHaveTextContent("Current");
    expect(screen.getByLabelText("Large estimate")).toHaveTextContent("L");
    expect(screen.getByLabelText("September 18, 2026")).toBeInTheDocument();
    expect(container.querySelector(".trail-status-glyph")).not.toBeInTheDocument();
    expect(container.querySelector("[data-workflow-issue-row='true']"))
      .toHaveClass("trail-collection-row");
  });

  it("keeps optional metadata visually absent without changing row ownership", () => {
    const { container } = render(
      <TrailWorkflowIssueRow
        labels={[]}
        priority={undefined}
        timezone="UTC"
        title="Backlog planning note"
      />,
    );

    expect(screen.getByText("Backlog planning note")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "No priority" })).toBeInTheDocument();
    expect(container.querySelector(".trail-workflow-issue-row__milestone")).toBeEmptyDOMElement();
    expect(container.querySelector(".trail-workflow-issue-row__labels")).toBeEmptyDOMElement();
    expect(container.querySelector(".trail-workflow-issue-row__cycle")).toBeEmptyDOMElement();
    expect(container.querySelector(".trail-workflow-issue-row__estimate")).toBeEmptyDOMElement();
    expect(container.querySelector(".trail-workflow-issue-row__due")).toBeEmptyDOMElement();
  });
});
