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
        .toHaveBeenCalledWith("Weekly current", "Updated weekly note");
    });

    fireEvent.click(screen.getByRole("button", { name: "Archive Current" }));
    await waitFor(() => {
      expect(harness.actions.weeklyNote.archiveCurrent)
        .toHaveBeenCalledWith("Updated weekly note", "Updated weekly note");
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Current")).toHaveValue("");
    });
  });

  it("keeps the local draft visible when persistence reports a stale Current conflict", async () => {
    const harness = createTrailUiTestHarness();
    const replaceCurrent = vi.fn(async () => {
      throw new Error("Weekly Note Current changed on disk. Reopen Home before saving.");
    });
    render(
      <TrailHomePage
        actions={{ ...harness.actions.weeklyNote, replaceCurrent }}
        onOpenCycles={vi.fn()}
        onOpenProjects={vi.fn()}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    const editor = await screen.findByLabelText("Current");
    fireEvent.change(editor, { target: { value: "Local unsaved draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Current" }));

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Weekly Note Current changed on disk. Reopen Home before saving.");
    expect(screen.getByLabelText("Current")).toHaveValue("Local unsaved draft");
  });
});
