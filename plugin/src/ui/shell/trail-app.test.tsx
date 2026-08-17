import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { setTrailRuntimeControl } from "../../runtime/store/trail-runtime-store";
import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { TrailApp } from "./trail-app";

describe("TrailApp", () => {
  it("keeps last-known-good pages visible but read-only during refresh and errors", () => {
    const harness = createTrailUiTestHarness();
    const view = render(
      <TrailApp actions={harness.actions} runtimeStore={harness.runtimeStore} />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Captured" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What needs your attention?")).toBeEnabled();

    act(() => {
      setTrailRuntimeControl(harness.runtimeStore, { kind: "refreshing" });
    });
    expect(screen.getByText("Refreshing Trail")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Captured" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What needs your attention?")).toBeDisabled();

    act(() => {
      setTrailRuntimeControl(harness.runtimeStore, {
        kind: "read-only-error",
        message: "Invalid managed source",
      });
    });
    expect(screen.getByText("Trail needs attention")).toBeInTheDocument();
    expect(screen.getByText("Invalid managed source")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Captured" })).toBeInTheDocument();

    view.unmount();
  });

  it("routes existing Triage and Project interactions through the Application surface", () => {
    const harness = createTrailUiTestHarness();
    render(<TrailApp actions={harness.actions} runtimeStore={harness.runtimeStore} />);

    fireEvent.change(screen.getByPlaceholderText("What needs your attention?"), {
      target: { value: "New capture" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Capture" }));
    expect(harness.actions.triage.capture).toHaveBeenCalledWith("New capture");

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    fireEvent.change(screen.getByPlaceholderText("Add a Workflow Issue"), {
      target: { value: "New issue" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Issue" }));
    expect(harness.actions.issues.create).toHaveBeenCalledWith("project-a", "New issue");
  });
});
