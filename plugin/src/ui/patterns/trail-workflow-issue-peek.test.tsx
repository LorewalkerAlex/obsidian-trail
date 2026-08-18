import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { parseTrailLocalDateTime } from "../interactions/trail-local-date-time";
import { TrailWorkflowIssuePeek } from "./trail-workflow-issue-peek";

function configurationWithSecondAreaLabel() {
  const configuration = createTrailTestConfiguration();
  return {
    ...configuration,
    labels: [
      ...configuration.labels,
      { groupId: "group-area", id: "label-personal", name: "Personal" },
    ],
  };
}

describe("TrailWorkflowIssuePeek", () => {
  it("edits the complete planning-property snapshot and closes after an accepted action", () => {
    const harness = createTrailUiTestHarness();
    const configuration = configurationWithSecondAreaLabel();
    const onOpenChange = vi.fn();
    render(
      <TrailWorkflowIssuePeek
        actions={harness.actions.issues}
        configuration={configuration}
        issueId={harness.workflow.id}
        onError={() => undefined}
        onOpenChange={onOpenChange}
        open
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated Issue" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Planning notes" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "high" } });
    fireEvent.change(screen.getByLabelText("Estimate"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Due (Asia/Singapore)"), {
      target: { value: "2026-08-21T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Area label"), { target: { value: "label-personal" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(harness.actions.issues.editProperties).toHaveBeenCalledWith(
      harness.workflow,
      {
        description: "Planning notes",
        due: parseTrailLocalDateTime("2026-08-21T09:30", "Asia/Singapore"),
        estimate: 5,
        labelIds: ["label-personal"],
        priority: "high",
        title: "Updated Issue",
      },
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not allow a Completed Issue to clear its required Estimate", () => {
    const harness = createTrailUiTestHarness({ workflowStatusDefinitionId: "issue-completed" });
    render(
      <TrailWorkflowIssuePeek
        actions={harness.actions.issues}
        configuration={createTrailTestConfiguration()}
        issueId={harness.workflow.id}
        onError={() => undefined}
        onOpenChange={() => undefined}
        open
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.change(screen.getByLabelText("Estimate"), { target: { value: "" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText("Completed issues must retain an estimate.")).toBeInTheDocument();
  });
});
