import {
  WorkflowNeedsInputError,
} from "../../../application/issues/trail-workflow-issue-application";
import type {
  TrailEntityMutationReceipt,
} from "../../../application/trail-application-contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailWorkflowIssue } from "../../../domain/trail-issue";

import {
  createReadyTrailUiStore,
  seedWorkflowProject,
} from "../../test/trail-ui-test-fixtures";
import {
  TrailProjectsPage,
  type TrailProjectsPageProps,
} from "./trail-projects-page";

function unusedActions(): Omit<TrailProjectsPageProps, "runtimeStore"> {
  const unused = (): never => {
    throw new Error("action is unused");
  };
  return {
    onCreateProject: unused,
    onCreateWorkflowIssue: unused,
    onWorkflowStatusChange: unused,
  };
}

describe("TrailProjectsPage", () => {
  it("submits a new Project through the Workflow action", () => {
    const store = createReadyTrailUiStore();
    const onCreateProject = vi.fn((_title: string): TrailEntityMutationReceipt => ({
      completion: Promise.resolve(),
      entityId: "project-new",
    }));

    render(
      <TrailProjectsPage
        {...unusedActions()}
        onCreateProject={onCreateProject}
        runtimeStore={store}
      />,
    );

    const input = screen.getByPlaceholderText("Create an outcome-focused Project");
    fireEvent.change(input, { target: { value: "Ship Workflow Entry" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    expect(onCreateProject).toHaveBeenCalledWith("Ship Workflow Entry");
    expect(input).toHaveValue("");
  });

  it("creates a Workflow Issue inside the selected Project", () => {
    const store = createReadyTrailUiStore();
    seedWorkflowProject(store);
    const onCreateWorkflowIssue = vi.fn((
      _projectId: string,
      _title: string,
    ): TrailEntityMutationReceipt => ({
      completion: Promise.resolve(),
      entityId: "workflow-issue-new",
    }));

    render(
      <TrailProjectsPage
        {...unusedActions()}
        onCreateWorkflowIssue={onCreateWorkflowIssue}
        runtimeStore={store}
      />,
    );

    const input = screen.getByPlaceholderText("Add a Workflow Issue");
    fireEvent.change(input, { target: { value: "Verify lifecycle" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Issue" }));

    expect(onCreateWorkflowIssue).toHaveBeenCalledWith(
      "project-a",
      "Verify lifecycle",
    );
    expect(input).toHaveValue("");
  });

  it("uses NeedsInput to request Estimate before Completed", () => {
    const store = createReadyTrailUiStore();
    const { issue } = seedWorkflowProject(store);
    const configuration = store.getState().committed.configuration;
    if (configuration === null) throw new Error("missing configuration");
    const completedId = configuration.statuses.issue.completed.defaultId;
    const onWorkflowStatusChange = vi.fn((
      expectedIssue: TrailWorkflowIssue,
      targetStatusDefinitionId: string,
      estimate?: number,
    ): TrailEntityMutationReceipt => {
      if (targetStatusDefinitionId === completedId && estimate === undefined) {
        throw new WorkflowNeedsInputError(
          "estimate",
          "Estimate is required before completing this Workflow Issue",
        );
      }
      return {
        completion: Promise.resolve(),
        entityId: expectedIssue.id,
      };
    });

    render(
      <TrailProjectsPage
        {...unusedActions()}
        onWorkflowStatusChange={onWorkflowStatusChange}
        runtimeStore={store}
      />,
    );

    fireEvent.change(screen.getByLabelText(`Status for ${issue.title}`), {
      target: { value: completedId },
    });

    expect(screen.getByText("Estimate required to complete")).toBeInTheDocument();
    const estimate = screen.getByRole("spinbutton");
    fireEvent.change(estimate, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    expect(onWorkflowStatusChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: issue.id }),
      completedId,
    );
    expect(onWorkflowStatusChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: issue.id }),
      completedId,
      3,
    );
  });
});
