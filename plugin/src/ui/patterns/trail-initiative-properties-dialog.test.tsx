import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { parseTrailLocalDateTime } from "../interactions/trail-local-date-time";
import { TrailInitiativePropertiesDialog } from "./trail-initiative-properties-dialog";

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

describe("TrailInitiativePropertiesDialog", () => {
  it("edits the complete Initiative-owned details snapshot and closes after acceptance", () => {
    const harness = createTrailUiTestHarness();
    const configuration = configurationWithSecondAreaLabel();
    const onOpenChange = vi.fn();
    render(
      <TrailInitiativePropertiesDialog
        actions={harness.actions.initiatives}
        configuration={configuration}
        initiativeId={harness.initiative.id}
        onError={() => undefined}
        onOpenChange={onOpenChange}
        open
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated Initiative" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Strategy notes" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "urgent" } });
    fireEvent.change(screen.getByLabelText("Due (Asia/Singapore)"), {
      target: { value: "2026-09-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Area label"), { target: { value: "label-personal" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(harness.actions.initiatives.editProperties).toHaveBeenCalledWith(
      harness.initiative,
      {
        description: "Strategy notes",
        due: parseTrailLocalDateTime("2026-09-01T09:30", "Asia/Singapore"),
        labelIds: ["label-personal"],
        priority: "urgent",
        title: "Updated Initiative",
      },
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
