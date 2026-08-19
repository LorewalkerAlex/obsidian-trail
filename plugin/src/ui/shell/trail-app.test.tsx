import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { setTrailRuntimeControl } from "../../runtime/store/trail-runtime-store";
import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { parseTrailLocalDateTime } from "../interactions/trail-local-date-time";
import { TrailApp } from "./trail-app";

describe("TrailApp", () => {
  it("keeps last-known-good pages visible but read-only during refresh and errors", () => {
    const harness = createTrailUiTestHarness();
    const view = render(
      <TrailApp actions={harness.actions} runtimeStore={harness.runtimeStore} />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Captured" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What needs your attention?")).toBeEnabled();

    act(() => {
      setTrailRuntimeControl(harness.runtimeStore, { kind: "refreshing" });
    });
    expect(screen.getByText("Refreshing Trail")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Captured" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What needs your attention?")).toBeDisabled();

    act(() => {
      setTrailRuntimeControl(harness.runtimeStore, {
        kind: "read-only-error",
        message: "Invalid managed source",
      });
    });
    expect(screen.getByText("Trail needs attention")).toBeInTheDocument();
    expect(screen.getByText("Invalid managed source")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Captured" })).toBeInTheDocument();

    view.unmount();
  });

  it("routes Search structural results into their existing Project hierarchy context", () => {
    const harness = createTrailUiTestHarness();
    render(<TrailApp actions={harness.actions} runtimeStore={harness.runtimeStore} />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByPlaceholderText("Search Trail"), {
      target: { value: "Project B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open Project B" }));
    expect(screen.getByRole("heading", { level: 2, name: "Project B" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByPlaceholderText("Search Trail"), {
      target: { value: "Initiative A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open Initiative A" }));
    expect(screen.getByRole("heading", { level: 2, name: "Initiative A" })).toBeInTheDocument();
  });

  it("routes Triage, Project, Milestone, Workflow, and Cycle interactions through Application", () => {
    const harness = createTrailUiTestHarness();
    render(<TrailApp actions={harness.actions} runtimeStore={harness.runtimeStore} />);

    fireEvent.change(screen.getByPlaceholderText("What needs your attention?"), {
      target: { value: "New capture" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Capture" }));
    expect(harness.actions.triage.capture).toHaveBeenCalledWith("New capture");

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    fireEvent.change(screen.getByPlaceholderText("Create a long-term Initiative"), {
      target: { value: "New initiative" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Initiative" }));
    expect(harness.actions.initiatives.create).toHaveBeenCalledWith("New initiative");

    fireEvent.click(screen.getByRole("button", { name: "Initiative A" }));
    fireEvent.click(screen.getByRole("button", { name: "Project A" }));
    fireEvent.change(screen.getByPlaceholderText("Add a Project Milestone"), {
      target: { value: "New milestone" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Milestone" }));
    expect(harness.actions.milestones.create).toHaveBeenCalledWith(
      "project-a",
      "New milestone",
      undefined,
    );

    fireEvent.change(screen.getByPlaceholderText("Add a Workflow Issue"), {
      target: { value: "New issue" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Issue" }));
    expect(harness.actions.issues.create).toHaveBeenCalledWith("project-a", "New issue");

    fireEvent.click(screen.getByRole("button", { name: "Cycles" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Include Issue A" }));
    fireEvent.change(screen.getByLabelText("Cycle planned end"), {
      target: { value: "2026-08-30T23:59" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open Cycle" }));

    expect(harness.actions.cycles.open).toHaveBeenCalledWith({
      issueIds: [harness.workflow.id],
      plannedEnd: parseTrailLocalDateTime("2026-08-30T23:59", "Asia/Singapore"),
    });
  });
});
