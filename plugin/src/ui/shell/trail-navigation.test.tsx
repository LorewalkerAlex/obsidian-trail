import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import { TrailNavigation } from "./trail-navigation";
import { createTrailNavigationStore } from "./trail-navigation-state";

describe("TrailNavigation", () => {
  it("renders the frozen V1 Sidebar skeleton with distinct section labels and actionable rows", () => {
    const navigationStore = createTrailNavigationStore();
    const onNavigate = vi.fn();

    render(
      <TrailNavigation
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        runtimeStore={createTrailTestRuntimeStore()}
        showDevelopment={false}
      />,
    );

    const navigation = screen.getByRole("navigation", { name: "Trail navigation" });
    const home = within(navigation).getByRole("button", { name: "Home" });
    const triage = within(navigation).getByRole("button", { name: "Triage" });
    const projects = within(navigation).getByRole("button", { name: "Projects" });
    const defaultProject = within(navigation).getByRole("button", { name: "Project A" });
    const cycles = within(navigation).getByRole("button", { name: "Cycles" });
    const workspaceLabel = within(navigation).getByText("Workspace");

    expect(home).toHaveAttribute("aria-current", "page");
    expect(triage).toBeInTheDocument();
    expect(workspaceLabel.closest("button")).toBeNull();
    expect(within(navigation).queryByRole("button", { name: "Workspace" })).not.toBeInTheDocument();
    expect(projects).toBeInTheDocument();
    expect(defaultProject).toBeInTheDocument();
    expect(cycles).toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "Foundation" })).not.toBeInTheDocument();

    for (const destination of [home, triage, projects, defaultProject, cycles]) {
      expect(destination.querySelector(".trail-navigation__row-icon")).not.toBeNull();
    }

    fireEvent.click(defaultProject);
    expect(onNavigate).toHaveBeenCalledWith({
      kind: "project",
      projectId: "project-a",
    });
  });

  it("takes active state only from host-restored location state", () => {
    const navigationStore = createTrailNavigationStore();

    render(
      <TrailNavigation
        navigationStore={navigationStore}
        onNavigate={vi.fn()}
        runtimeStore={createTrailTestRuntimeStore()}
        showDevelopment={false}
      />,
    );

    act(() => navigationStore.getState().restore({ kind: "projects" }));

    expect(screen.getByRole("button", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("opens Search as temporary Sidebar state without changing the current Page", () => {
    const navigationStore = createTrailNavigationStore({ kind: "projects" });

    render(
      <TrailNavigation
        navigationStore={navigationStore}
        onNavigate={vi.fn()}
        runtimeStore={createTrailTestRuntimeStore()}
        showDevelopment={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    const input = screen.getByRole("textbox", { name: "Search Trail" });
    expect(input).toHaveFocus();
    expect(navigationStore.getState().location).toEqual({ kind: "projects" });
    expect(navigationStore.getState().sidebarMode).toBe("search");
    expect(screen.queryByRole("navigation", { name: "Trail navigation" })).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.getByRole("navigation", { name: "Trail navigation" })).toBeInTheDocument();
    expect(navigationStore.getState().location).toEqual({ kind: "projects" });
    expect(navigationStore.getState().sidebarMode).toBe("navigation");
  });

  it("exposes Foundation only through the development section", () => {
    const onNavigate = vi.fn();

    render(
      <TrailNavigation
        navigationStore={createTrailNavigationStore()}
        onNavigate={onNavigate}
        runtimeStore={createTrailTestRuntimeStore()}
        showDevelopment
      />,
    );

    const developmentLabel = screen.getByText("Development");
    const foundation = screen.getByRole("button", { name: "Foundation" });
    expect(developmentLabel.closest("button")).toBeNull();
    expect(foundation.querySelector(".trail-navigation__row-icon")).not.toBeNull();
    fireEvent.click(foundation);
    expect(onNavigate).toHaveBeenCalledWith({ kind: "foundation" });
  });
});
