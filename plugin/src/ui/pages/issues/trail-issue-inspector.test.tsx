import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  TrailCycle,
  TrailMilestone,
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
import { TrailIssueInspector } from "./trail-issue-inspector";

function fixture(statusDefinitionId = "issue-started", inCurrentCycle = true) {
  const projectA: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const projectB: TrailProject = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project B",
  };
  const milestone: TrailMilestone = {
    id: "milestone-a",
    projectId: projectA.id,
    title: "Milestone A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    estimate: "medium",
    id: "issue-a",
    labelIds: ["label-work"],
    milestoneId: milestone.id,
    priority: "high",
    projectId: projectA.id,
    statusDefinitionId,
    terminalAt: statusDefinitionId === "issue-completed" ? 4 : undefined,
    title: "Inspect this issue",
  };
  const cycle: TrailCycle = {
    id: "cycle-open",
    issueIds: inCurrentCycle ? [issue.id] : [],
    plannedEnd: Date.UTC(2026, 8, 20),
    startedAt: Date.UTC(2026, 8, 8),
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(projectA.id),
    },
    sources: [
      {
        issues: [issue],
        kind: "project",
        milestones: [milestone],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project B.md",
      },
      {
        cycles: [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { cycle, issue, store };
}

type TrailIssueInspectorActions = {
  cycles: Pick<TrailUiActions["cycles"], "changeMembership">;
  issues: Pick<
    TrailUiActions["issues"],
    "changeMilestone" | "changeStatus" | "editProperties" | "moveToProject"
  >;
};

function actions(): TrailIssueInspectorActions {
  return {
    cycles: {
      changeMembership: vi.fn(() => ({ entityId: "cycle-open", kind: "unchanged" as const })),
    },
    issues: {
      changeMilestone: vi.fn(() => ({ entityId: "issue-a", kind: "unchanged" as const })),
      changeStatus: vi.fn(() => ({ entityId: "issue-a", kind: "unchanged" as const })),
      editProperties: vi.fn(() => ({ entityId: "issue-a", kind: "unchanged" as const })),
      moveToProject: vi.fn(() => ({ entityId: "issue-a", kind: "unchanged" as const })),
    },
  };
}

describe("TrailIssueInspector", () => {
  it("renders the canonical property family and explicit Current Cycle membership action", () => {
    const { cycle, issue, store } = fixture();
    const uiActions = actions();

    render(
      <TrailIssueInspector
        actions={uiActions}
        issueId={issue.id}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Inspect this issue" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status: started" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project: Project A" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Priority: High" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Milestone: Milestone A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Labels: Work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Estimate: Medium" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove from current cycle" }));
    expect(uiActions.cycles.changeMembership).toHaveBeenCalledWith(cycle, []);
  });

  it("adds a Workflow Issue to the Current Cycle without treating Cycle as an Issue property", () => {
    const { cycle, issue, store } = fixture("issue-started", false);
    const uiActions = actions();

    render(<TrailIssueInspector actions={uiActions} issueId={issue.id} runtimeStore={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to current cycle" }));
    expect(uiActions.cycles.changeMembership).toHaveBeenCalledWith(cycle, [issue.id]);
    expect(uiActions.issues.editProperties).not.toHaveBeenCalled();
  });

  it("uses a required searchable Project relation and the existing Move application intent", () => {
    const { issue, store } = fixture();
    const uiActions = actions();
    render(<TrailIssueInspector actions={uiActions} issueId={issue.id} runtimeStore={store} />);

    const trigger = screen.getByRole("button", { name: "Project: Project A" });
    expect(trigger).toHaveAttribute("aria-required", "true");
    fireEvent.click(trigger);
    const popover = screen.getByLabelText("Project");
    fireEvent.change(within(popover).getByRole("searchbox", { name: "Search project" }), {
      target: { value: "Project B" },
    });
    fireEvent.click(within(popover).getByRole("button", { name: "Project B" }));
    expect(uiActions.issues.moveToProject).toHaveBeenCalledWith(issue, "project-b");
  });

  it("keeps property chrome stable while a submitted mutation settles", async () => {
    const { cycle, issue, store } = fixture();
    let resolveCompletion = () => {};
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });
    const uiActions = actions();
    uiActions.cycles.changeMembership = vi.fn(() => ({
      kind: "submitted" as const,
      receipt: {
        commandId: "command-a",
        completion,
        entityId: cycle.id,
      },
    }));

    render(<TrailIssueInspector actions={uiActions} issueId={issue.id} runtimeStore={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove from current cycle" }));

    expect(screen.getByRole("button", { name: "Status: started" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Project: Project A" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Priority: High" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove from current cycle" })).toBeEnabled();

    await act(async () => {
      resolveCompletion();
      await completion;
    });
  });

  it("does not offer clearing Estimate for a Completed Issue", () => {
    const { issue, store } = fixture("issue-completed");
    render(<TrailIssueInspector actions={actions()} issueId={issue.id} runtimeStore={store} />);

    const estimate = screen.getByRole("button", { name: "Estimate: Medium" });
    expect(estimate).toHaveAttribute("aria-required", "true");
    fireEvent.click(estimate);
    expect(within(screen.getByLabelText("Estimate")).queryByText("No estimate"))
      .not.toBeInTheDocument();
  });
});
