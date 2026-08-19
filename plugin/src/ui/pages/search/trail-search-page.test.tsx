import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import { TrailSearchPage } from "./trail-search-page";

function renderSearch() {
  const harness = createTrailUiTestHarness();
  const onOpenInitiative = vi.fn();
  const onOpenProject = vi.fn();
  render(
    <TrailSearchPage
      actions={{ issues: harness.actions.issues, triage: harness.actions.triage }}
      onOpenInitiative={onOpenInitiative}
      onOpenProject={onOpenProject}
      runtimeStore={harness.runtimeStore}
      writable
    />,
  );
  return { harness, onOpenInitiative, onOpenProject };
}

describe("TrailSearchPage", () => {
  it("routes structural results without inventing another entity details surface", () => {
    const { onOpenProject } = renderSearch();
    fireEvent.change(screen.getByPlaceholderText("Search Trail"), {
      target: { value: "Milestone A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open Milestone A" }));
    expect(onOpenProject).toHaveBeenCalledWith("project-a");
  });

  it("reuses Workflow Peek and the existing Triage row for Issue results", () => {
    renderSearch();
    const search = screen.getByPlaceholderText("Search Trail");

    fireEvent.change(search, { target: { value: "Issue A" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue A" }));
    expect(screen.getByRole("dialog", { name: "Issue A" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.change(search, { target: { value: "Captured" } });
    expect(screen.getByText("Captured")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
  });
});
