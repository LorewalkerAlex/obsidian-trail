import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import { TrailProjectsPage } from "./trail-projects-page";

describe("Initiative Details in Projects Workspace", () => {
  it("opens the Initiative details editor from Initiative Focus", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailProjectsPage
        actions={harness.actions}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Initiative A" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));

    expect(screen.getByRole("dialog", { name: "Initiative A" })).toHaveAccessibleDescription(
      "Edit Initiative details.",
    );
  });
});
