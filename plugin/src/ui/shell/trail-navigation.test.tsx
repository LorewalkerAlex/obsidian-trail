import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import { TrailNavigation } from "./trail-navigation";
import { createTrailNavigationStore } from "./trail-navigation-state";

function createSearchRuntimeStore() {
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState("project-a"),
    },
    sources: [
      {
        initiative: {
          id: "initiative-a",
          labelIds: [],
          title: "Initiative Alpha",
        },
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative Alpha.md",
      },
      {
        issues: [{
          context: "workflow",
          createdAt: 1,
          id: "issue-a",
          labelIds: [],
          projectId: "project-a",
          statusDefinitionId: "issue-backlog",
          title: "Alpha workflow",
        }],
        kind: "project",
        milestones: [],
        project: {
          id: "project-a",
          initiativeId: "initiative-a",
          labelIds: [],
          statusDefinitionId: "project-unstarted",
          title: "Project Alpha",
        },
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(runtimeStore, { kind: "ready" });
  return runtimeStore;
}

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
    const onNavigate = vi.fn();

    render(
      <TrailNavigation
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        runtimeStore={createTrailTestRuntimeStore()}
        showDevelopment={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    const input = screen.getByRole("textbox", { name: "Search Trail" });
    expect(input).toHaveFocus();
    expect(input).not.toHaveAttribute("placeholder");
    expect(navigationStore.getState().location).toEqual({ kind: "projects" });
    expect(navigationStore.getState().sidebarMode).toBe("search");
    expect(screen.queryByRole("navigation", { name: "Trail navigation" })).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.getByRole("navigation", { name: "Trail navigation" })).toBeInTheDocument();
    expect(navigationStore.getState().location).toEqual({ kind: "projects" });
    expect(navigationStore.getState().sidebarMode).toBe("navigation");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("groups Sidebar Search results and activates every result kind through normal navigation", () => {
    const navigationStore = createTrailNavigationStore({ kind: "projects" });
    const onNavigate = vi.fn();

    render(
      <TrailNavigation
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        runtimeStore={createSearchRuntimeStore()}
        showDevelopment={false}
      />,
    );

    const searchForAlpha = () => {
      fireEvent.click(screen.getByRole("button", { name: "Search" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Search Trail" }), {
        target: { value: "Alpha" },
      });
      expect(screen.getByRole("region", { name: "Initiatives" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Projects" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Issues" })).toBeInTheDocument();
    };

    searchForAlpha();
    fireEvent.click(screen.getByRole("button", { name: "Initiative Alpha" }));
    expect(onNavigate).toHaveBeenLastCalledWith({
      initiativeId: "initiative-a",
      kind: "initiative",
    });
    expect(navigationStore.getState().sidebarMode).toBe("navigation");

    searchForAlpha();
    fireEvent.click(screen.getByRole("button", { name: "Project Alpha" }));
    expect(onNavigate).toHaveBeenLastCalledWith({ kind: "project", projectId: "project-a" });

    searchForAlpha();
    fireEvent.click(screen.getByRole("button", { name: "Alpha workflow" }));
    expect(onNavigate).toHaveBeenLastCalledWith({ issueId: "issue-a", kind: "issue" });
    expect(navigationStore.getState().location).toEqual({ kind: "projects" });
  });

  it("supports Arrow navigation from the Search input through the grouped result list", () => {
    const navigationStore = createTrailNavigationStore();

    render(
      <TrailNavigation
        navigationStore={navigationStore}
        onNavigate={vi.fn()}
        runtimeStore={createSearchRuntimeStore()}
        showDevelopment={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const input = screen.getByRole("textbox", { name: "Search Trail" });
    fireEvent.change(input, { target: { value: "Alpha" } });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "Initiative Alpha" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "Project Alpha" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowUp" });
    expect(screen.getByRole("button", { name: "Initiative Alpha" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowUp" });
    expect(input).toHaveFocus();
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
