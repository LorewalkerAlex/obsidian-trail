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
  const closeCommitted = () => {
    publishCycleFixture(store, project, [active, completed], {
      ...cycle,
      endedAt: Date.UTC(2026, 7, 31, 4),
    });
  };
  return { active, closeCommitted, completed, cycle, store };
}

function actions(onClose?: () => void) {
  const changePlannedEnd = vi.fn(() => ({ entityId: "cycle-a", kind: "unchanged" as const }));
  const close = vi.fn(() => {
    onClose?.();
    return {
      commandId: "command-close",
      completion: Promise.resolve(),
      entityId: "cycle-a",
    };
  });
  const start = vi.fn((_input: { readonly issueIds?: readonly string[]; readonly plannedEnd: number }) => ({
    commandId: "command-start",
    completion: Promise.resolve(),
    entityId: "cycle-next",
  }));
  const value = { changePlannedEnd, close, start } as unknown as Pick<
    TrailUiActions["cycles"],
    "changePlannedEnd" | "close" | "start"
  >;
  return { changePlannedEnd, close, start, value };
}

describe("TrailCycleInspector", () => {
  it("renders Current Cycle period, progress, scope, effort, editable end, and close action", () => {
    const { cycle, store } = readyCycleStore();
    const { value } = actions();
    render(<TrailCycleInspector actions={value} cycleId={cycle.id} runtimeStore={store} />);

    expect(screen.getByRole("heading", { level: 2, name: "Aug 18 – Aug 30" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Period" })).not.toBeInTheDocument();
    const progress = screen.getByRole("progressbar", { name: "Cycle progress" });
    expect(progress).toHaveAttribute("value", "1");
    expect(progress).toHaveAttribute("max", "2");
    expect(screen.getByText("Scope").nextElementSibling).toHaveTextContent("2 issues");
    expect(screen.getByText("Effort").nextElementSibling).toHaveTextContent("0");
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

  it("confirms close with retained membership and unfinished-work facts", async () => {
    const { cycle, store } = readyCycleStore();
    const { close, value } = actions();
    render(<TrailCycleInspector actions={value} cycleId={cycle.id} runtimeStore={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Close cycle" }));
    expect(screen.getByText("Close cycle?")).toBeInTheDocument();
    expect(screen.getByText("2 issues will remain associated with this cycle.")).toBeInTheDocument();
    expect(screen.getByText("1 issue is still open.")).toBeInTheDocument();
    expect(screen.getByText("Closing does not change any Issue properties.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close and start next" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(cycle));
  });

  it("closes first, opens Start-next with live open members selected, and cancel does not roll back close", async () => {
    const { active, closeCommitted, cycle, store } = readyCycleStore();
    const { close, start, value } = actions(closeCommitted);

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

    await waitFor(() => expect(close).toHaveBeenCalledWith(cycle));
    const dialog = await screen.findByRole("dialog", { name: "Start cycle" });
    expect(within(dialog).getByLabelText(`Deselect ${active.title}`)).toBeChecked();
    expect(within(dialog).queryByText("Completed issue")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(start).not.toHaveBeenCalled();
    expect(store.getState().committed.authoritative.domain.cyclesById.get(cycle.id)?.endedAt).toBeDefined();
  });

  it("starts the next Cycle through the normal Start action and activates it after persistence", async () => {
    const { active, closeCommitted, cycle, store } = readyCycleStore();
    const { start, value } = actions(closeCommitted);
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

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(start.mock.calls[0]?.[0].issueIds).toEqual([active.id]);
    await waitFor(() => expect(onCycleActivate).toHaveBeenCalledWith("cycle-next"));
  });

  it("renders Historical Cycle facts read-only without Progress or Close", () => {
    const { cycle, store } = readyCycleStore(true);
    const { value } = actions();
    render(<TrailCycleInspector actions={value} cycleId={cycle.id} runtimeStore={store} />);

    expect(screen.getByRole("heading", { level: 2, name: "Aug 18 – Aug 30" })).toBeInTheDocument();
    expect(screen.getByText("Closed cycle")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Cycle progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Planned end:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close cycle" })).not.toBeInTheDocument();
    expect(screen.getByText("Closed").nextElementSibling).not.toBeEmptyDOMElement();
  });
});
