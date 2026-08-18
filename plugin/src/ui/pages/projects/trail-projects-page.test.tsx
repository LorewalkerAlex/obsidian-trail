import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import { TrailProjectsPage } from "./trail-projects-page";

describe("TrailProjectsPage", () => {
  it("maps the Project lifecycle picker to the existing Project Application action", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailProjectsPage
        actions={{
          issues: harness.actions.issues,
          projects: harness.actions.projects,
        }}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

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
    render(
      <TrailProjectsPage
        actions={{
          issues: harness.actions.issues,
          projects: { ...harness.actions.projects, changeStatus },
        }}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

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
    render(
      <TrailProjectsPage
        actions={{
          issues: harness.actions.issues,
          projects: harness.actions.projects,
        }}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

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
    render(
      <TrailProjectsPage
        actions={{
          issues: harness.actions.issues,
          projects: harness.actions.projects,
        }}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

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
    const actions = {
      issues: { ...harness.actions.issues, changeStatus },
      projects: harness.actions.projects,
    };

    render(
      <TrailProjectsPage
        actions={actions}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

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
    render(
      <TrailProjectsPage
        actions={{
          issues: { ...harness.actions.issues, changeStatus },
          projects: harness.actions.projects,
        }}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.change(screen.getByLabelText("Status for Issue A"), {
      target: { value: "issue-completed" },
    });
    const dialog = screen.getByRole("dialog", { name: "Estimate required to complete" });
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(changeStatus).toHaveBeenCalledTimes(1);
  });
});
