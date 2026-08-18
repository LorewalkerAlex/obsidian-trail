import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { parseTrailLocalDateTime } from "../interactions/trail-local-date-time";
import { TrailProjectPropertiesDialog } from "./trail-project-properties-dialog";

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

describe("TrailProjectPropertiesDialog", () => {
  it("edits only the complete Project-owned details snapshot and closes after acceptance", () => {
    const harness = createTrailUiTestHarness();
    const configuration = configurationWithSecondAreaLabel();
    const onOpenChange = vi.fn();
    render(
      <TrailProjectPropertiesDialog
        actions={harness.actions.projects}
        configuration={configuration}
        onError={() => undefined}
        onOpenChange={onOpenChange}
        open
        projectId={harness.project.id}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated Project" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Outcome notes" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "high" } });
    fireEvent.change(screen.getByLabelText("Due (Asia/Singapore)"), {
      target: { value: "2026-08-25T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Area label"), { target: { value: "label-personal" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(harness.actions.projects.editProperties).toHaveBeenCalledWith(
      harness.project,
      {
        description: "Outcome notes",
        due: parseTrailLocalDateTime("2026-08-25T09:30", "Asia/Singapore"),
        labelIds: ["label-personal"],
        priority: "high",
        title: "Updated Project",
      },
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
