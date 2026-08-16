import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import { TrailProjectsPage } from "./trail-projects-page";

describe("TrailProjectsPage", () => {
  it("renders NeedsInput as an explicit Estimate gate before completion", () => {
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
    expect(screen.getByText("Estimate required to complete")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(changeStatus).toHaveBeenLastCalledWith(
      harness.workflow,
      "issue-completed",
      3,
    );
  });
});
