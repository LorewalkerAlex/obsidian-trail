import {
  fireEvent,
  render,
  screen,
  waitFor,
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
} from "../../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../../test/trail-test-fixtures";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCycleInspector } from "./trail-cycle-inspector";

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
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [active, completed],
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
  setTrailRuntimeControl(store, { kind: "ready" });
  return { cycle, store };
}

function actions() {
  const changePlannedEnd = vi.fn(() => ({ entityId: "cycle-a", kind: "unchanged" as const }));
  const close = vi.fn(() => ({
    commandId: "command-close",
    completion: Promise.resolve(),
    entityId: "cycle-a",
  }));
  const value = { changePlannedEnd, close } as unknown as Pick<
    TrailUiActions["cycles"],
    "changePlannedEnd" | "close"
  >;
  return { changePlannedEnd, close, value };
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
    expect(screen.getByText("Closing does not change any issue properties.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(cycle));
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
