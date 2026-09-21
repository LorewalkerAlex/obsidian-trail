import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCyclesPage } from "./trail-cycles-page";

afterEach(() => {
  vi.restoreAllMocks();
});

function readyStore(includeCurrent: boolean) {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const history = {
    endedAt: Date.UTC(2026, 7, 17, 12),
    id: "cycle-history",
    issueIds: [],
    plannedEnd: Date.UTC(2026, 7, 17, 12),
    startedAt: Date.UTC(2026, 7, 4, 12),
  };
  const current = {
    id: "cycle-current",
    issueIds: [],
    plannedEnd: Date.UTC(2026, 8, 20, 12),
    startedAt: Date.UTC(2026, 8, 7, 12),
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
        cycles: includeCurrent ? [history, current] : [history],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { current, history, store };
}

function startAction(entityId = "cycle-new") {
  return vi.fn((_input: { readonly issueIds?: readonly string[]; readonly plannedEnd: number }) => ({
    commandId: "command-cycle-start",
    completion: Promise.resolve(),
    entityId,
  }));
}

function cycleActions(start = startAction()) {
  return { start } as unknown as Pick<
    TrailUiActions["cycles"],
    "closeAndStartNext" | "start"
  >;
}

describe("TrailCyclesPage", () => {
  it("shows the compact previous-cycle browser and activates the whole Historical Cycle row", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 10, 4));
    const { history, store } = readyStore(false);
    const onCycleActivate = vi.fn();

    render(
      <TrailCyclesPage
        actions={cycleActions()}
        onCycleActivate={onCycleActivate}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Cycles" })).toBeInTheDocument();
    expect(screen.getByText("No current cycle")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Start cycle" })).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2, name: "Previous" })).toBeInTheDocument();
    expect(screen.getByText("0 issues")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open / })).not.toBeInTheDocument();
    expect(screen.queryByText(/Completed Aug/)).not.toBeInTheDocument();

    const historyRow = screen.getByRole("link", { name: /2026-08-04 to 2026-08-17.*0 issues/ });
    fireEvent.click(historyRow);
    expect(onCycleActivate).toHaveBeenCalledWith(history.id);

    onCycleActivate.mockClear();
    fireEvent.keyDown(historyRow, { key: "Enter" });
    expect(onCycleActivate).toHaveBeenCalledWith(history.id);
  });

  it("opens the standard Start Cycle flow, starts empty, and navigates after persistence", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 10, 4));
    const { store } = readyStore(false);
    const start = startAction();
    const onCycleActivate = vi.fn();

    render(
      <TrailCyclesPage
        actions={cycleActions(start)}
        onCycleActivate={onCycleActivate}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Start cycle" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Start cycle" });
    expect(within(dialog).getByText("Select issues now or start empty and add issues later."))
      .toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Start cycle" }));

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    const input = start.mock.calls[0]?.[0];
    expect(input?.issueIds).toEqual([]);
    const plannedEnd = input?.plannedEnd;
    expect(plannedEnd).toBeTypeOf("number");
    if (typeof plannedEnd !== "number") return;
    expect(readTrailZonedDateTimeParts(plannedEnd, "Asia/Singapore")).toMatchObject({
      day: 20,
      hour: 23,
      millisecond: 999,
      minute: 59,
      month: 9,
      second: 59,
      year: 2026,
    });
    await waitFor(() => expect(onCycleActivate).toHaveBeenCalledWith("cycle-new"));
  });

  it("shows Previous cycles without a duplicate Start action while a Current Cycle exists", () => {
    const { store } = readyStore(true);

    render(
      <TrailCyclesPage
        actions={cycleActions()}
        onCycleActivate={vi.fn()}
        runtimeStore={store}
      />,
    );

    expect(screen.queryByText("No current cycle")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start cycle" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Previous" })).toBeInTheDocument();
  });
});
