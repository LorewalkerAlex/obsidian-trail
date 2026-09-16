import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TrailCycle } from "../../../domain/model/trail-entities";
import {
  readTrailZonedDateTimeParts,
} from "../../../domain/rules/trail-temporal-rules";
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
import { TrailCycleStart } from "./trail-cycle-start";

afterEach(() => {
  vi.restoreAllMocks();
});

function readyStore(includeCurrent = true) {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const active = {
    context: "workflow" as const,
    createdAt: 1,
    id: "issue-active",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Active issue",
  };
  const backlog = {
    context: "workflow" as const,
    createdAt: 2,
    id: "issue-backlog",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Backlog issue",
  };
  const completed = {
    context: "workflow" as const,
    createdAt: 3,
    id: "issue-completed",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-completed",
    terminalAt: Date.UTC(2026, 7, 3),
    title: "Completed issue",
  };
  const sourceCycle = {
    id: "cycle-current",
    issueIds: [active.id, completed.id],
    plannedEnd: Date.UTC(2026, 8, 20),
    startedAt: Date.UTC(2026, 8, 7),
  };
  const historicalCycle = {
    ...sourceCycle,
    endedAt: Date.UTC(2026, 7, 31, 4),
    id: "cycle-history",
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [active, backlog, completed],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        cycles: [includeCurrent ? sourceCycle : historicalCycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { active, backlog, completed, sourceCycle, store };
}

function actions() {
  const start = vi.fn((_input: { readonly issueIds?: readonly string[]; readonly plannedEnd: number }) => ({
    commandId: "command-cycle-start",
    completion: Promise.resolve(),
    entityId: "cycle-new",
  }));
  const closeAndStartNext = vi.fn((
    _expectedCycle: TrailCycle,
    _input: { readonly issueIds?: readonly string[]; readonly plannedEnd: number },
  ) => ({
    commandId: "command-cycle-rollover",
    completion: Promise.resolve(),
    entityId: "cycle-next",
  }));
  return { closeAndStartNext, start };
}

describe("TrailCycleStart", () => {
  it("starts an ordinary Cycle empty by default with an editable configured planned end", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 10, 4));
    const { store } = readyStore(false);
    const cycleActions = actions();
    const onStarted = vi.fn();

    render(
      <TrailCycleStart
        actions={cycleActions}
        onDismiss={vi.fn()}
        onStarted={onStarted}
        runtimeStore={store}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Start cycle" });
    expect(within(dialog).getByLabelText("Select Active issue")).not.toBeChecked();
    expect(within(dialog).getByLabelText("Select Backlog issue")).not.toBeChecked();
    expect(within(dialog).queryByText("Completed issue")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Start cycle" }));

    await waitFor(() => expect(cycleActions.start).toHaveBeenCalledTimes(1));
    expect(cycleActions.closeAndStartNext).not.toHaveBeenCalled();
    const input = cycleActions.start.mock.calls[0]?.[0];
    expect(input?.issueIds).toEqual([]);
    const plannedEnd = input?.plannedEnd;
    expect(plannedEnd).toBeTypeOf("number");
    if (typeof plannedEnd === "number") {
      expect(readTrailZonedDateTimeParts(plannedEnd, "Asia/Singapore")).toMatchObject({
        day: 20,
        hour: 23,
        millisecond: 999,
        minute: 59,
        month: 9,
        second: 59,
        year: 2026,
      });
    }
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith("cycle-new"));
  });

  it("plans Start-next from the still-open source and submits one compound action", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 10, 4));
    const { active, backlog, sourceCycle, store } = readyStore();
    const cycleActions = actions();

    render(
      <TrailCycleStart
        actions={cycleActions}
        onDismiss={vi.fn()}
        onStarted={vi.fn()}
        runtimeStore={store}
        sourceCycleId={sourceCycle.id}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Start cycle" });
    expect(within(dialog).getByLabelText(`Deselect ${active.title}`)).toBeChecked();
    expect(within(dialog).getByLabelText(`Select ${backlog.title}`)).not.toBeChecked();
    expect(store.getState().committed.authoritative.domain.cyclesById.get(sourceCycle.id)?.endedAt)
      .toBeUndefined();

    fireEvent.click(within(dialog).getByLabelText(`Deselect ${active.title}`));
    fireEvent.click(within(dialog).getByLabelText(`Select ${backlog.title}`));
    fireEvent.click(within(dialog).getByRole("button", { name: "Start cycle" }));

    await waitFor(() => expect(cycleActions.closeAndStartNext).toHaveBeenCalledTimes(1));
    expect(cycleActions.start).not.toHaveBeenCalled();
    expect(cycleActions.closeAndStartNext.mock.calls[0]?.[0]).toEqual(sourceCycle);
    expect(cycleActions.closeAndStartNext.mock.calls[0]?.[1].issueIds).toEqual([backlog.id]);
  });

  it("cancels Start-next without mutating the open source Cycle", () => {
    const { sourceCycle, store } = readyStore();
    const cycleActions = actions();
    const onDismiss = vi.fn();

    render(
      <TrailCycleStart
        actions={cycleActions}
        onDismiss={onDismiss}
        onStarted={vi.fn()}
        runtimeStore={store}
        sourceCycleId={sourceCycle.id}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(cycleActions.start).not.toHaveBeenCalled();
    expect(cycleActions.closeAndStartNext).not.toHaveBeenCalled();
    expect(store.getState().committed.authoritative.domain.cyclesById.get(sourceCycle.id)).toEqual(sourceCycle);
  });
});
