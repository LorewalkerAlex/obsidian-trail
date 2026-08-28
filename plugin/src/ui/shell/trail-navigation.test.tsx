import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { TrailNavigation } from "./trail-navigation";
import { createTrailNavigationStore } from "./trail-navigation-state";

function renderNavigation(defaultProjectId?: string) {
  const harness = createTrailUiTestHarness({ defaultProjectId });
  const navigationStore = createTrailNavigationStore();
  render(
    <TrailNavigation
      navigationStore={navigationStore}
      onNavigate={(location) => navigationStore.getState().navigate(location)}
      runtimeStore={harness.runtimeStore}
    />,
  );
  return { harness, navigationStore };
}

describe("TrailNavigation", () => {
  it("renders the ordinary Default Project shortcut by current Project title", () => {
    const { harness, navigationStore } = renderNavigation();

    expect(screen.getByRole("button", { name: harness.project.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: harness.project.title }));

    expect(navigationStore.getState().location).toEqual({
      kind: "project",
      projectId: harness.project.id,
    });
    expect(screen.getByRole("button", { name: harness.project.title }))
      .toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Projects" }))
      .not.toHaveAttribute("aria-current");
  });

  it("renders the Project referenced as Default instead of assuming list order", () => {
    const { harness } = renderNavigation("project-b");
    expect(screen.getByRole("button", { name: harness.projectB.title })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: harness.project.title })).not.toBeInTheDocument();
  });

  it("routes Search, Capture, Projects, and Cycles through the shared navigation state", () => {
    const { navigationStore } = renderNavigation();

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(navigationStore.getState().location).toEqual({ kind: "search" });

    fireEvent.click(screen.getByRole("button", { name: "Capture" }));
    expect(navigationStore.getState().location).toEqual({ kind: "triage" });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(navigationStore.getState().location).toEqual({ kind: "projects" });

    fireEvent.click(screen.getByRole("button", { name: "Cycles" }));
    expect(navigationStore.getState().location).toEqual({ kind: "cycles" });
  });
});
