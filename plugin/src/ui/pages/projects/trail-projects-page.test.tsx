import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailProjectsPage } from "./trail-projects-page";

function renderProjects(
  harness: ReturnType<typeof createTrailUiTestHarness>,
  overrides: {
    readonly issues?: TrailUiActions["issues"];
    readonly milestones?: TrailUiActions["milestones"];
    readonly projects?: TrailUiActions["projects"];
  } = {},
) {
  return render(
    <TrailProjectsPage
      actions={{
        initiatives: harness.actions.initiatives,
        issues: overrides.issues ?? harness.actions.issues,
        milestones: overrides.milestones ?? harness.actions.milestones,
        projects: overrides.projects ?? harness.actions.projects,
      }}
      runtimeStore={harness.runtimeStore}
      writable
    />,
  );
}

function openProjectA(): void {
  fireEvent.click(screen.getByRole("button", { name: "Initiative A" }));
  fireEvent.click(screen.getByRole("button", { name: "Project A" }));
}

describe("TrailProjectsPage", () => {
  it("implements Projects Root to Initiative Focus to Project Workspace navigation", () => {
    const harness = createTrailUiTestHarness();
    renderProjects(harness);

    expect(screen.getByRole("button", { name: "Initiative A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project B" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Project A" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Initiative A" }));
    expect(screen.getByRole("heading", { level: 2, name: "Initiative A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project A" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project A" }));
    expect(screen.getByRole("heading", { level: 2, name: "Project A" })).toBeInTheDocument();
  });

  it("maps Initiative creation to the existing Initiative Application action", () => {
    const harness = createTrailUiTestHarness();
    renderProjects(harness);

    fireEvent.change(screen.getByPlaceholderText("Create a long-term Initiative"), {
      target: { value: "Long-term outcome" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Initiative" }));

    expect(harness.actions.initiatives.create).toHaveBeenCalledWith("Long-term outcome");
  });

  it("maps explicit Project Initiative changes to Project Application", () => {
    const harness = createTrailUiTestHarness();
    renderProjects(harness);
    openProjectA();

    fireEvent.change(screen.getByLabelText("Initiative for Project A"), {
      target: { value: "" },
    });

    expect(harness.actions.projects.changeInitiative).toHaveBeenCalledWith(
      harness.project,
      undefined,
    );
  });

  it("creates a Project-scoped Milestone with an optional configured-timezone Due", () => {
    const harness = createTrailUiTestHarness();
    renderProjects(harness);
    openProjectA();

    fireEvent.change(screen.getByPlaceholderText("Add a Project Milestone"), {
      target: { value: "Checkpoint" },
    });
    fireEvent.change(screen.getByLabelText("Milestone due"), {
      target: { value: "2026-08-20T09:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Milestone" }));

    expect(harness.actions.milestones.create).toHaveBeenCalledWith(
      harness.project.id,
      "Checkpoint",
      Date.UTC(2026, 7, 20, 1, 30),
    );
  });

  it("maps explicit Issue Milestone removal to the existing Issue Application action", () => {
    const harness = createTrailUiTestHarness();
    renderProjects(harness);
    openProjectA();

    fireEvent.change(screen.getByLabelText("Milestone for Issue A"), {
      target: { value: "" },
    });

    expect(harness.actions.issues.changeMilestone).toHaveBeenCalledWith(
      harness.workflow,
      undefined,
    );
  });

  it("renders derived Milestone progress without a manual Milestone lifecycle", () => {
    const harness = createTrailUiTestHarness({
      workflowStatusDefinitionId: "issue-completed",
    });
    renderProjects(harness);
    openProjectA();

    expect(screen.getByText(/1 of 1 Issues terminal/)).toBeInTheDocument();
  });

  it("deletes a Milestone through the shared confirmation while preserving Issue semantics", () => {
    const harness = createTrailUiTestHarness();
    renderProjects(harness);
    openProjectA();

    fireEvent.click(screen.getByRole("button", { name: "Delete Milestone A" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete Milestone?" });
    expect(dialog).toHaveAccessibleDescription(
      "Linked Workflow Issues stay in their Project and are detached from this Milestone.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(harness.actions.milestones.delete).toHaveBeenCalledWith(harness.milestone);
  });

  it("maps the Project lifecycle picker to the existing Project Application action", () => {
    const harness = createTrailUiTestHarness();
    renderProjects(harness);
    openProjectA();

    fireEvent.change(screen.getByLabelText("Project status for Project A"), {
      target: { value: "project-started" },
    });
    expect(harness.actions.projects.changeStatus).toHaveBeenCalledWith(
      harness.project,
      "project-started",
    );
  });

  it("surfaces a rejected Project completion without inventing page-local lifecycle rules", () => {
    const harness = createTrailUiTestHarness();
    const changeStatus = vi.fn(() => {
      throw new Error("Project cannot be completed while Issue issue-a is non-terminal");
    });
    renderProjects(harness, {
      projects: { ...harness.actions.projects, changeStatus },
    });
    openProjectA();

    fireEvent.change(screen.getByLabelText("Project status for Project A"), {
      target: { value: "project-completed" },
    });

    expect(changeStatus).toHaveBeenCalledWith(harness.project, "project-completed");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Project cannot be completed while Issue issue-a is non-terminal",
    );
  });

  it("keeps terminal Projects readable but requires explicit reopen before adding work", () => {
    const harness = createTrailUiTestHarness({
      projectStatusDefinitionId: "project-completed",
      workflowStatusDefinitionId: "issue-canceled",
    });
    renderProjects(harness);
    openProjectA();

    expect(screen.getByPlaceholderText("Add a Workflow Issue")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Issue" })).toBeDisabled();
    expect(screen.getByText("Reopen this Project before adding new Workflow Issues."))
      .toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Project status for Project A"), {
      target: { value: "project-unstarted" },
    });
    expect(harness.actions.projects.changeStatus).toHaveBeenCalledWith(
      harness.project,
      "project-unstarted",
    );
  });

  it("maps the Project picker to an identity-preserving Issue move action", () => {
    const harness = createTrailUiTestHarness();
    renderProjects(harness);
    openProjectA();

    fireEvent.change(screen.getByLabelText("Project for Issue A"), {
      target: { value: harness.projectB.id },
    });
    expect(harness.actions.issues.moveToProject).toHaveBeenCalledWith(
      harness.workflow,
      harness.projectB.id,
    );
  });

  it("renders NeedsInput in the shared modal Estimate gate before completion", async () => {
    const harness = createTrailUiTestHarness();
    const changeStatus = vi.fn()
      .mockReturnValueOnce({
        input: {
          code: "estimate-required",
          message: "Estimate is required before completing this Workflow Issue",
        },
        kind: "needs-input",
      })
      .mockReturnValueOnce({
        kind: "unchanged",
        entityId: harness.workflow.id,
      });
    renderProjects(harness, {
      issues: { ...harness.actions.issues, changeStatus },
    });
    openProjectA();

    const statusPicker = screen.getByLabelText("Status for Issue A");
    fireEvent.change(statusPicker, { target: { value: "issue-completed" } });
    expect(changeStatus).toHaveBeenCalledWith(harness.workflow, "issue-completed");

    const dialog = screen.getByRole("dialog", { name: "Estimate required to complete" });
    expect(dialog).toHaveAccessibleDescription(
      "Add an Estimate before moving Issue A to Completed.",
    );
    const estimate = screen.getByRole("spinbutton");
    await waitFor(() => expect(estimate).toHaveFocus());

    fireEvent.change(estimate, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(changeStatus).toHaveBeenLastCalledWith(
      harness.workflow,
      "issue-completed",
      3,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("dismisses the shared Estimate gate with Escape without submitting a second action", async () => {
    const harness = createTrailUiTestHarness();
    const changeStatus = vi.fn().mockReturnValue({
      input: {
        code: "estimate-required",
        message: "Estimate is required before completing this Workflow Issue",
      },
      kind: "needs-input",
    });
    renderProjects(harness, {
      issues: { ...harness.actions.issues, changeStatus },
    });
    openProjectA();

    fireEvent.change(screen.getByLabelText("Status for Issue A"), {
      target: { value: "issue-completed" },
    });
    const dialog = screen.getByRole("dialog", { name: "Estimate required to complete" });
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(changeStatus).toHaveBeenCalledTimes(1);
  });
});
