import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import { TrailCyclePage } from "./trail-cycle-page";

afterEach(() => {
  vi.restoreAllMocks();
});

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function readyStore(plannedEnd = Date.UTC(2026, 8, 14)) {
  const projectA = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Beta",
  };
  const alpha = {
    context: "workflow" as const,
    createdAt: Date.UTC(2026, 8, 1),
    id: "issue-alpha",
    labelIds: [],
    projectId: projectA.id,
    statusDefinitionId: "issue-started",
    title: "Build current cycle page",
  };
  const beta = {
    context: "workflow" as const,
    createdAt: Date.UTC(2026, 8, 2),
    id: "issue-beta",
    labelIds: [],
    projectId: projectB.id,
    statusDefinitionId: "issue-unstarted",
    title: "Verify project swimlanes",
  };
  const cycle = {
    id: "cycle-current",
    issueIds: [alpha.id, beta.id],
    plannedEnd,
    startedAt: Date.UTC(2026, 8, 1),
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(projectA.id),
    },
    sources: [
      {
        issues: [alpha],
        kind: "project",
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        issues: [beta],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project Beta.md",
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

describe("TrailCyclePage", () => {
  it("composes the Current Cycle as Board by default and reuses the mixed-Project List", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 10, 12));
    const { cycle, store } = readyStore();
    const onProjectActivate = vi.fn();

    render(
      <TrailCyclePage
        actions={{ changeStatus: vi.fn() }}
        cycleId={cycle.id}
        onCyclesActivate={vi.fn()}
        onIssueActivate={vi.fn()}
        onProjectActivate={onProjectActivate}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sep");
    const summary = screen.getByRole("group", { name: "Cycle summary" });
    expect(summary).toHaveTextContent("4 days left");
    expect(summary).toHaveTextContent("2 issues");
    expect(summary).not.toHaveTextContent("Ends Sep 14");
    const board = screen.getByRole("region", { name: "Current cycle board" });
    expect(within(board).getByRole("region", { name: "Project Alpha project swimlane" }))
      .toBeInTheDocument();
    expect(within(board).getByRole("region", { name: "Project Beta project swimlane" }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project Alpha" }));
    expect(onProjectActivate).toHaveBeenCalledWith("project-a");

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.queryByRole("region", { name: "Current cycle board" })).not.toBeInTheDocument();
    expect(screen.getByText("Build current cycle page")).toBeInTheDocument();
    expect(screen.getByText("Verify project swimlanes")).toBeInTheDocument();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("shows a relative overdue state instead of repeating the range end date", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 20, 12));
    const { cycle, store } = readyStore();

    render(
      <TrailCyclePage
        actions={{ changeStatus: vi.fn() }}
        cycleId={cycle.id}
        onCyclesActivate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    const summary = screen.getByRole("group", { name: "Cycle summary" });
    expect(summary).toHaveTextContent("6 days overdue");
    expect(summary).not.toHaveTextContent("Ends Sep 14");
  });

  it("opens the shared Issue Peek from a Cycle Board card", () => {
    const { cycle, store } = readyStore();

    render(
      <TrailCyclePage
        actions={{ changeStatus: vi.fn() }}
        cycleId={cycle.id}
        onCyclesActivate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByText("Build current cycle page"));
    const peek = screen.getByRole("complementary", { name: "Issue peek: Build current cycle page" });
    expect(peek).toBeInTheDocument();
    expect(within(peek).getByText("Project Alpha")).toBeInTheDocument();
  });
});
