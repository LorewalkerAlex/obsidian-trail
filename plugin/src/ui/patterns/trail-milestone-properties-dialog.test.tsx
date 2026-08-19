import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { parseTrailLocalDateTime } from "../interactions/trail-local-date-time";
import { TrailMilestonePropertiesDialog } from "./trail-milestone-properties-dialog";

describe("TrailMilestonePropertiesDialog", () => {
  it("maps Milestone-owned details to the canonical edit action and closes after acceptance", () => {
    const harness = createTrailUiTestHarness();
    const onOpenChange = vi.fn();
    render(
      <TrailMilestonePropertiesDialog
        actions={harness.actions.milestones}
        milestoneId={harness.milestone.id}
        onError={() => undefined}
        onOpenChange={onOpenChange}
        open
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated Milestone" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Checkpoint notes" } });
    fireEvent.change(screen.getByLabelText("Due (Asia/Singapore)"), {
      target: { value: "2026-09-01T09:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(harness.actions.milestones.editProperties).toHaveBeenCalledWith(
      harness.milestone,
      {
        description: "Checkpoint notes",
        due: parseTrailLocalDateTime("2026-09-01T09:30", "Asia/Singapore"),
        title: "Updated Milestone",
      },
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
