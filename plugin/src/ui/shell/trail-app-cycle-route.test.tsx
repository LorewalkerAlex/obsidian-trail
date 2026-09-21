import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import type { TrailMarkdownRender } from "../patterns/trail-page-narrative";
import { TrailApp } from "./trail-app";
import { createTrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function readyCycleStore() {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const history = {
    endedAt: Date.UTC(2026, 7, 17),
    id: "cycle-history",
    issueIds: [],
    plannedEnd: Date.UTC(2026, 7, 17),
    startedAt: Date.UTC(2026, 7, 4),
  };
  const cycle = {
    id: "cycle-current",
    issueIds: [],
    plannedEnd: Date.UTC(2026, 8, 14),
    startedAt: Date.UTC(2026, 8, 1),
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        cycles: [history, cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { cycle, history, store };
}

function actions(): TrailUiActions {
  return {
    cycles: {
      changeMembership: vi.fn(),
      start: vi.fn(),
    },
    issues: {
      changeStatus: vi.fn(),
    },
    projects: {},
  } as unknown as TrailUiActions;
}

describe("TrailApp Cycle route", () => {
  it("mounts the real Cycle Page on the shared nested-scroll surface", () => {
    const { cycle, store } = readyCycleStore();
    const navigationStore = createTrailNavigationStore({
      cycleId: cycle.id,
      kind: "cycle",
    });
    const { container } = render(
      <TrailApp
        actions={actions()}
        navigationStore={navigationStore}
        onNavigate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
        showDevelopment={false}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Current: 2026-09-01");
    expect(screen.getAllByRole("button", { name: "Add issues" })).not.toHaveLength(0);
    expect(screen.getByRole("region", { name: "Current cycle board" })).toBeInTheDocument();
    expect(screen.queryByText("This page has not been implemented yet.")).not.toBeInTheDocument();
    expect(container.querySelector(".trail-page-surface")).toHaveAttribute("data-scroll", "nested");
    expect(container.querySelector(".trail-page-surface")).toHaveAttribute("data-inset", "none");
  });

  it("mounts the Cycles root and routes Previous Cycle rows through the shell boundary", () => {
    const { history, store } = readyCycleStore();
    const navigationStore = createTrailNavigationStore({ kind: "cycles" });
    const onNavigate = vi.fn();
    const { container } = render(
      <TrailApp
        actions={actions()}
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
        showDevelopment={false}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Cycles" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Previous" })).toBeInTheDocument();
    expect(screen.queryByText("This page has not been implemented yet.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /2026-08-04 to 2026-08-17/ }));
    expect(onNavigate).toHaveBeenCalledWith({ cycleId: history.id, kind: "cycle" });
    expect(container.querySelector(".trail-page-surface")).toHaveAttribute("data-scroll", "nested");
    expect(container.querySelector(".trail-page-surface")).toHaveAttribute("data-inset", "none");
  });
});
