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
import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import { TrailNavigation } from "./trail-navigation";
import { createTrailNavigationStore } from "./trail-navigation-state";

function readyCurrentCycleStore() {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const cycle = {
    id: "cycle-current",
    issueIds: [],
    plannedEnd: 200,
    startedAt: 100,
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
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        cycles: [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { cycle, store };
}

describe("TrailNavigation Cycles destination", () => {
  it("opens the Current Cycle directly when one exists", () => {
    const { cycle, store } = readyCurrentCycleStore();
    const onNavigate = vi.fn();

    render(
      <TrailNavigation
        navigationStore={createTrailNavigationStore()}
        onNavigate={onNavigate}
        runtimeStore={store}
        showDevelopment={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cycles" }));
    expect(onNavigate).toHaveBeenCalledWith({
      cycleId: cycle.id,
      kind: "cycle",
    });
  });

  it("keeps Cycles index as the destination when no Current Cycle exists", () => {
    const onNavigate = vi.fn();

    render(
      <TrailNavigation
        navigationStore={createTrailNavigationStore()}
        onNavigate={onNavigate}
        runtimeStore={createTrailTestRuntimeStore()}
        showDevelopment={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cycles" }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: "cycles" });
  });
});
