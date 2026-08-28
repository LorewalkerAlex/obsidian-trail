import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { TrailWorkflowPresentation } from "./trail-workflow-presentation";

describe("TrailWorkflowPresentation", () => {
  it("defaults to List and exposes the configured Statuses as Board columns", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailWorkflowPresentation
        actions={harness.actions.issues}
        configuration={createTrailTestConfiguration()}
        issueIds={[harness.workflow.id]}
        laneMode="single"
        onError={() => undefined}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    expect(screen.getByLabelText("Project for Issue A")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "No Project" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    for (const status of ["backlog", "unstarted", "started", "completed", "canceled"]) {
      expect(screen.getByLabelText(`${status} Issues`)).toBeInTheDocument();
    }
    expect(screen.getByRole("article", { name: "Issue A" })).toBeInTheDocument();
  });

  it("keeps the Status picker as the non-drag path and reuses the Estimate completion gate", async () => {
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
        entityId: harness.workflow.id,
        kind: "unchanged",
      });
    render(
      <TrailWorkflowPresentation
        actions={{ ...harness.actions.issues, changeStatus }}
        configuration={createTrailTestConfiguration()}
        issueIds={[harness.workflow.id]}
        laneMode="single"
        onError={() => undefined}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    fireEvent.change(screen.getByLabelText("Status for Issue A"), {
      target: { value: "issue-completed" },
    });
    expect(changeStatus).toHaveBeenCalledWith(harness.workflow, "issue-completed");

    const dialog = screen.getByRole("dialog", { name: "Estimate required to complete" });
    expect(dialog).toHaveAccessibleDescription(
      "Add an Estimate before moving Issue A to Completed.",
    );
    const estimate = screen.getByLabelText("Estimate");
    await waitFor(() => expect(estimate).toHaveFocus());

    fireEvent.change(estimate, { target: { value: "medium" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(changeStatus).toHaveBeenLastCalledWith(harness.workflow, "issue-completed", "medium");
  });

  it("opens the same Workflow Issue Peek from both List and Board without changing workspace context", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailWorkflowPresentation
        actions={harness.actions.issues}
        configuration={createTrailTestConfiguration()}
        issueIds={[harness.workflow.id]}
        laneMode="single"
        onError={() => undefined}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Issue A" }));
    expect(screen.getByRole("dialog", { name: "Issue A" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    fireEvent.click(screen.getByRole("button", { name: "Issue A" }));
    expect(screen.getByRole("dialog", { name: "Issue A" })).toBeInTheDocument();
  });
});
