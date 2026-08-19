import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import { TrailHomePage } from "./trail-home-page";

describe("TrailHomePage", () => {
  it("shows existing Runtime summaries, routes to established pages, and edits Weekly Note", async () => {
    const harness = createTrailUiTestHarness();
    const openCycles = vi.fn();
    const openProjects = vi.fn();
    render(
      <TrailHomePage
        actions={harness.actions.weeklyNote}
        onOpenCycles={openCycles}
        onOpenProjects={openProjects}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    expect(screen.getByText("1 Initiatives · 2 Projects")).toBeInTheDocument();
    expect(screen.getByText("No Cycle is open.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Cycles" }));
    expect(openProjects).toHaveBeenCalledOnce();
    expect(openCycles).toHaveBeenCalledOnce();

    const editor = await screen.findByLabelText("Current");
    expect(editor).toHaveValue("Weekly current");
    fireEvent.change(editor, { target: { value: "Updated weekly note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Current" }));
    await waitFor(() => {
      expect(harness.actions.weeklyNote.replaceCurrent)
        .toHaveBeenCalledWith("Updated weekly note");
    });

    fireEvent.click(screen.getByRole("button", { name: "Archive Current" }));
    await waitFor(() => {
      expect(harness.actions.weeklyNote.archiveCurrent)
        .toHaveBeenCalledWith("Updated weekly note");
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Current")).toHaveValue("");
    });
  });
});
