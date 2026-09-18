import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  TrailCycle,
  TrailProject,
  TrailWorkflowIssue,
} from "../../../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
  type TrailRuntimeStore,
} from "../../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../../test/trail-test-fixtures";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCycleInspector } from "./trail-cycle-inspector";

function publishCycleFixture(
  store: TrailRuntimeStore,
  project: TrailProject,
  issues: readonly TrailWorkflowIssue[],
  cycle: TrailCycle,
) {
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues,
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        cycles: [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
}

function readyCycleStore(closed = false) {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const active: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 2,
    id: "issue-active",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Active issue",
  };
  const completed: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-completed",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-completed",
    terminalAt: Date.UTC(2026, 7, 25, 4),
    title: "Completed issue",
  };
  const cycle: TrailCycle = {
    ...(closed ? { endedAt: Date.UTC(2026, 7, 31, 4) } : {}),
    id: "cycle-a",
    issueIds: [active.id, completed.id],
    plannedEnd: Date.UTC(2026, 7, 30, 4),
    startedAt: Date.UTC(2026, 7, 18, 4),
  };
  const store = createTrailRuntimeStore();
  publishCycleFixture(store, project, [active, completed], cycle);
  setTrailRuntimeControl(store, { kind: "ready" });
  return { active, completed, cycle, store };
}

function actions() {
  const changePlannedEnd = vi.fn(() => ({ entityId: "cycle-a", kind: "unchanged" as const }));
  const close = vi.fn(() => ({
    commandId: "command-close",
    completion: Promise.resolve(),
    entityId: "cycle-a",
  }));
  const closeAndStartNext = vi.fn((
    _expectedCycle: TrailCycle,
    _input: { readonly issueIds?: readonly string[]; readonly plannedEnd: number },
  ) => ({
    commandId: "command-rollover",
    completion: Promise.resolve(),
    entityId: "cycle-next",
  }));
  const start = vi.fn((_input: { readonly issueIds?: readonly string[]; readonly plannedEnd: number }) => ({
    commandId: "command-start",
    completion: Promise.resolve(),
    entityId: "cycle-next",
  }));
  const value = { changePlannedEnd, close, closeAndStartNext, start } as unknown as Pick<
    TrailUiActions["cycles"],
    "changePlannedEnd" | "close" | "closeAndStartNext" | "start"
  >;
  return { changePlannedEnd, close, closeAndStartNext, start, value };
}

describe("TrailCycleInspector", () => {
  it("renders complementary Current Cycle facts without repeating Page range, progress, or scope", () => {
    const { cycle, store } = readyCycleStore();
    const { value } = actions();
    render(<TrailCycleInspector actions={value} cycleId={cycle.id} runtimeStore={store} />);

    expect(screen.queryByText("Aug 18 – Aug 30")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Cycle progress" })).not.toBeInTheDocument();
    expect(screen.queryByText("Scope")).not.toBeInTheDocument();
    expect(screen.getByText("Effort").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("Started").nextElementSibling).not.toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: /^Planned end:/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close cycle" })).toBeInTheDocument();
  });

  it("changes planned end through the Cycle Application action", async () => {
    const { cycle, store } = readyCycleStore();
    const { changePlannedEnd, value } = actions();
    render(<TrailCycleInspector actions={value} cycleId={cycle.id} runtimeStore={store} />);

    fireEvent.click(screen.getByRole("button", { name: /^Planned end:/ }));
    fireEvent.change(screen.getByLabelText("Planned end date"), {
      target: { value: "2026-09-02" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(changePlannedEnd).toHaveBeenCalledTimes(1));
    expect(changePlannedEnd).toHaveBeenCalledWith(
      cycle,
      Date.UTC(2026, 8, 2, 4),
    );
  });

  it("confirms ordinary close with retained membership and distinguishes Start-next transfer planning", async () => {
    const { cycle, store } = readyCycleStore();
    const { close: closeAction, value } = actions();
    render(<TrailCycleInspector actions={value} cycleId={cycle.id} runtimeStore={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Close cycle" }));
    expect(screen.getByText("Close cycle?")).toBeInTheDocument();
    expect(screen.getByText("Aug 18 – Aug 30")).toBeInTheDocument();
    expect(screen.getByText("2 issues · 1 open")).toBeInTheDocument();
    expect(screen.queryByText(/keeps the current membership/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lets you choose transfers/i)).not.toBeInTheDocument();
    const closeButton = screen.getByRole("button", { name: "Close" });
    const startNext = screen.getByRole("button", { name: "Close and start next" });
    expect(closeButton).toHaveAttribute("data-confirmation-tone", "danger");
    expect(startNext).not.toHaveAttribute("data-confirmation-tone");
    expect(startNext).not.toHaveClass("trail-button--primary");

    fireEvent.click(closeButton);
    await waitFor(() => expect(closeAction).toHaveBeenCalledWith(cycle));
  });

  it("opens Start-next while the source remains open and cancel leaves it unchanged", async () => {
    const { active, cycle, store } = readyCycleStore();
    const { close, closeAndStartNext, start, value } = actions();

    render(
      <TrailCycleInspector
        actions={value}
        cycleId={cycle.id}
        onCycleActivate={vi.fn()}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close cycle" }));
    fireEvent.click(screen.getByRole("button", { name: "Close and start next" }));

    const dialog = await screen.findByRole("dialog", { name: "Start cycle" });
    expect(within(dialog).getByLabelText(`Deselect ${active.title}`)).toBeChecked();
    expect(within(dialog).queryByText("Completed issue")).not.toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
    expect(closeAndStartNext).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(store.getState().committed.authoritative.domain.cyclesById.get(cycle.id)).toEqual(cycle);

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(closeAndStartNext).not.toHaveBeenCalled();
    expect(store.getState().committed.authoritative.domain.cyclesById.get(cycle.id)).toEqual(cycle);
  });

  it("confirms Start-next through one compound Cycle action and activates the successor", async () => {
    const { active, cycle, store } = readyCycleStore();
    const { close, closeAndStartNext, start, value } = actions();
    const onCycleActivate = vi.fn();

    render(
      <TrailCycleInspector
        actions={value}
        cycleId={cycle.id}
        onCycleActivate={onCycleActivate}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close cycle" }));
    fireEvent.click(screen.getByRole("button", { name: "Close and start next" }));
    const dialog = await screen.findByRole("dialog", { name: "Start cycle" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Start cycle" }));

    await waitFor(() => expect(closeAndStartNext).toHaveBeenCalledTimes(1));
    expect(closeAndStartNext.mock.calls[0]?.[0]).toEqual(cycle);
    expect(closeAndStartNext.mock.calls[0]?.[1].issueIds).toEqual([active.id]);
    expect(close).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    await waitFor(() => expect(onCycleActivate).toHaveBeenCalledWith("cycle-next"));
  });

  it("renders Historical Cycle lifecycle facts without repeating Page identity or scope", () => {
    const { cycle, store } = readyCycleStore(true);
    const { value } = actions();
    render(<TrailCycleInspector actions={value} cycleId={cycle.id} runtimeStore={store} />);

    expect(screen.queryByText("Aug 18 – Aug 30")).not.toBeInTheDocument();
    expect(screen.queryByText("Closed cycle")).not.toBeInTheDocument();
    expect(screen.queryByText("Scope")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Cycle progress" })).not.toBeInTheDocument();
    expect(screen.getByText("Effort").nextElementSibling).toHaveTextContent("0");
    expect(screen.queryByRole("button", { name: /^Planned end:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close cycle" })).not.toBeInTheDocument();
    expect(screen.getByText("Closed").nextElementSibling).not.toBeEmptyDOMElement();
  });
});
