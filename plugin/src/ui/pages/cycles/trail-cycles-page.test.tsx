import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailCycle } from "../../../domain/model/trail-entities";
import { createTrailMutationPlan } from "../../../mutation/plans/trail-mutation-plan";
import { addTrailPendingPlan } from "../../../runtime/projection/trail-runtime-projection";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../../test/trail-test-fixtures";
import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import { parseTrailLocalDateTime } from "../../interactions/trail-local-date-time";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCyclesPage } from "./trail-cycles-page";

function receipt(entityId: string) {
  return {
    commandId: `command-${entityId}`,
    completion: Promise.resolve(),
    entityId,
  };
}

function openCycleHarness() {
  const configuration = createTrailTestConfiguration();
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const active = {
    context: "workflow" as const,
    createdAt: 1,
    id: "issue-active",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Active",
  };
  const completed = {
    context: "workflow" as const,
    createdAt: 2,
    estimate: 1,
    id: "issue-completed",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 3,
    title: "Completed",
  };
  const cycle: TrailCycle = {
    id: "cycle-open",
    issueIds: [active.id, completed.id],
    plannedEnd: Date.UTC(2026, 7, 30, 15, 59),
    startedAt: Date.UTC(2026, 7, 18, 5, 0),
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      {
        issues: [active, completed],
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
  setTrailRuntimeControl(runtimeStore, { kind: "ready" });

  const changeMembership = vi.fn(() => ({
    entityId: cycle.id,
    kind: "unchanged" as const,
  }));
  const close = vi.fn((expectedCycle: TrailCycle) => {
    addTrailPendingPlan(runtimeStore, createTrailMutationPlan({
      commandId: "command-close-cycle",
      effects: [{
        after: { kind: "cycle", value: { ...expectedCycle, endedAt: Date.UTC(2026, 7, 25) } },
        before: { kind: "cycle", value: expectedCycle },
        kind: "replace-entity",
      }],
      intent: "test.cycle.close",
    }));
    return receipt(expectedCycle.id);
  });
  const open = vi.fn(() => receipt("cycle-next"));
  const actions: TrailUiActions["cycles"] = { changeMembership, close, open };
  const issueActions: TrailUiActions["issues"] = {
    changeMilestone: vi.fn(() => ({ entityId: active.id, kind: "unchanged" as const })),
    changeStatus: vi.fn(() => ({ entityId: active.id, kind: "unchanged" as const })),
    editProperties: vi.fn(() => ({ entityId: active.id, kind: "unchanged" as const })),
    create: vi.fn(() => receipt("new-issue")),
    moveToProject: vi.fn(() => ({ entityId: active.id, kind: "unchanged" as const })),
  };
  return { actions, active, completed, configuration, cycle, issueActions, runtimeStore };
}

describe("TrailCyclesPage", () => {
  it("opens a Cycle with explicit membership and a concrete planned end", () => {
    const harness = createTrailUiTestHarness();
    const configuration = createTrailTestConfiguration();
    render(
      <TrailCyclesPage
        actions={harness.actions.cycles}
        configuration={configuration}
        issueActions={harness.actions.issues}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Include Issue A" }));
    fireEvent.change(screen.getByLabelText("Cycle planned end"), {
      target: { value: "2026-08-30T23:59" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open Cycle" }));

    expect(harness.actions.cycles.open).toHaveBeenCalledWith({
      issueIds: [harness.workflow.id],
      plannedEnd: parseTrailLocalDateTime("2026-08-30T23:59", "Asia/Singapore"),
    });
  });

  it("changes membership explicitly, closes the Cycle, and preselects unfinished rollover", () => {
    const harness = openCycleHarness();
    render(
      <TrailCyclesPage
        actions={harness.actions}
        configuration={harness.configuration}
        issueActions={harness.issueActions}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Include Active" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Include Completed" })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Include Active" }));
    expect(harness.actions.changeMembership).toHaveBeenCalledWith(
      harness.cycle,
      [harness.completed.id],
    );

    fireEvent.click(screen.getByRole("button", { name: "Close Cycle" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm close" }));

    expect(harness.actions.close).toHaveBeenCalledWith(harness.cycle);
    expect(screen.getByRole("heading", { level: 2, name: "Open next Cycle" }))
      .toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Include Active" })).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "Include Completed" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel next Cycle" }));
    expect(screen.getByRole("heading", { level: 2, name: "Open Cycle" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Include Active" })).not.toBeChecked();
  });

  it("executes the Current Cycle through the shared Board without changing membership semantics", () => {
    const harness = openCycleHarness();
    render(
      <TrailCyclesPage
        actions={harness.actions}
        configuration={harness.configuration}
        issueActions={harness.issueActions}
        runtimeStore={harness.runtimeStore}
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(screen.getByRole("article", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByLabelText("started Issues")).toContainElement(
      screen.getByRole("article", { name: "Active" }),
    );

    fireEvent.change(screen.getByLabelText("Status for Active"), {
      target: { value: "issue-unstarted" },
    });
    expect(harness.issueActions.changeStatus).toHaveBeenCalledWith(
      harness.active,
      "issue-unstarted",
    );
    expect(harness.actions.changeMembership).not.toHaveBeenCalled();
  });
});
