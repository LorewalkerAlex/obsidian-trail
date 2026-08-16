import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { addTrailCalendarDays } from "../../../domain/rules/trail-temporal-rules";
import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import { TrailTriagePage } from "./trail-triage-page";

describe("TrailTriagePage", () => {
  it("maps Defer to seven configured-zone calendar days", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Defer 7 days" }));
    expect(harness.actions.triage.defer).toHaveBeenCalledWith(
      harness.triage,
      addTrailCalendarDays(harness.triage.due, "Asia/Singapore", 7),
    );
  });

  it("keeps edit drafts local until Save", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const title = screen.getByDisplayValue("Captured");
    fireEvent.change(title, { target: { value: "Refined" } });
    expect(harness.actions.triage.edit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(harness.actions.triage.edit).toHaveBeenCalledWith(
      harness.triage,
      expect.objectContaining({ title: "Refined" }),
    );
  });
});
