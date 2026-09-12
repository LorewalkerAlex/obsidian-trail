import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailCycleStatusSectionReadModel } from "../../../query/cycles/trail-cycle-page-query";
import { TrailCycleBoard, selectTrailCycleBoardSections } from "./trail-cycle-board";

const SECTIONS: readonly TrailCycleStatusSectionReadModel[] = [
  {
    category: "backlog",
    id: "status-backlog",
    issues: [],
    label: "Backlog",
  },
  {
    category: "unstarted",
    id: "status-todo",
    issues: [{
      id: "issue-a",
      inCurrentCycle: true,
      labels: [],
      project: { id: "project-a", title: "Project Alpha" },
      status: { category: "unstarted", id: "status-todo", label: "Todo" },
      title: "Prepare alpha",
    }],
    label: "Todo",
  },
  {
    category: "started",
    id: "status-started",
    issues: [{
      id: "issue-b",
      inCurrentCycle: true,
      labels: [],
      project: { id: "project-b", title: "Project Beta" },
      status: { category: "started", id: "status-started", label: "In Progress" },
      title: "Execute beta",
    }],
    label: "In Progress",
  },
  {
    category: "completed",
    id: "status-done",
    issues: [],
    label: "Done",
  },
  {
    category: "canceled",
    id: "status-canceled",
    issues: [],
    label: "Canceled",
  },
];

const PROJECTS = [
  { id: "project-a", issueCount: 1, title: "Project Alpha" },
  { id: "project-b", issueCount: 1, title: "Project Beta" },
  { id: "project-c", issueCount: 1, title: "Project Gamma" },
] as const;

describe("TrailCycleBoard", () => {
  it("keeps the normal execution Status columns and renders persistent Project swimlanes", () => {
    expect(selectTrailCycleBoardSections(SECTIONS).map(({ id }) => id)).toEqual([
      "status-todo",
      "status-started",
      "status-done",
    ]);

    render(
      <TrailCycleBoard
        projects={PROJECTS}
        sections={SECTIONS}
        timezone="Asia/Singapore"
      />,
    );

    const board = screen.getByRole("region", { name: "Current cycle board" });
    expect(within(board).queryByText("Backlog")).not.toBeInTheDocument();
    expect(within(board).queryByText("Canceled")).not.toBeInTheDocument();
    expect(within(board).getByText("Todo")).toBeInTheDocument();
    expect(within(board).getByText("In Progress")).toBeInTheDocument();
    expect(within(board).getByText("Done")).toBeInTheDocument();

    for (const project of PROJECTS) {
      expect(within(board).getByRole("region", {
        name: `${project.title} project swimlane`,
      })).toBeInTheDocument();
    }
    expect(within(board).getByText("Prepare alpha")).toBeInTheDocument();
    expect(within(board).getByText("Execute beta")).toBeInTheDocument();
    expect(within(board).queryByLabelText("In current cycle")).not.toBeInTheDocument();

    const gammaLane = within(board).getByRole("region", {
      name: "Project Gamma project swimlane",
    });
    expect(gammaLane.querySelectorAll(".trail-workflow-issue-card")).toHaveLength(0);
    expect(gammaLane.querySelectorAll("[data-workflow-issue-status-drop-target]")).toHaveLength(3);
  });

  it("keeps Project identity navigable without turning the lane into a drop target", () => {
    const onProjectActivate = vi.fn();
    render(
      <TrailCycleBoard
        onProjectActivate={onProjectActivate}
        projects={PROJECTS}
        sections={SECTIONS}
        timezone="Asia/Singapore"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Project Beta" }));
    expect(onProjectActivate).toHaveBeenCalledWith("project-b");

    const betaLane = screen.getByRole("region", { name: "Project Beta project swimlane" });
    expect(betaLane).not.toHaveAttribute("data-workflow-issue-status-drop-target");
  });
});
