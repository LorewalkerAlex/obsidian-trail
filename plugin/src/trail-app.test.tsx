import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDefaultTrailPluginData } from "./domain/trail-configuration";
import {
  addPendingPlan,
  createTrailRuntimeStore,
  reconcileProjectContribution,
  reconcileTriageContribution,
  removePendingPlan,
  setSourceIssuesForPath,
  setTrailRuntimeAvailability,
  setTrailRuntimeConfiguration,
} from "./domain/trail-runtime";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "./domain/trail-issue";
import type { TrailProject } from "./domain/trail-project";
import type { TriageCaptureReceipt } from "./domain/trail-triage-intake";
import type { TriageManagementReceipt } from "./domain/trail-triage-management";
import {
  WorkflowNeedsInputError,
  type WorkflowEntryReceipt,
} from "./domain/trail-workflow-entry";
import { TrailApp } from "./trail-app";

function readyStore() {
  const store = createTrailRuntimeStore();
  let id = 0;
  setTrailRuntimeConfiguration(store, createDefaultTrailPluginData({
    createId: () => `status-${id += 1}`,
    timezone: "UTC",
  }).configuration);
  setTrailRuntimeAvailability(store, {
    kind: "ready",
    timezone: "UTC",
  });
  reconcileTriageContribution(store, {
    filePath: "Trail/Collections/Triage.md",
    issuesById: {},
    sourceByIssueId: {},
  });
  return store;
}


function unusedManagementProps() {
  const unused = (): TriageManagementReceipt => {
    throw new Error("management action is unused");
  };
  const unusedWorkflow = (): WorkflowEntryReceipt => {
    throw new Error("workflow action is unused");
  };
  return {
    onCreateProject: unusedWorkflow,
    onCreateWorkflowIssue: unusedWorkflow,
    onDefer: unused,
    onDelete: unused,
    onEdit: unused,
    onWorkflowStatusChange: unusedWorkflow,
  };
}

function seedIssue(
  store: ReturnType<typeof readyStore>,
  issue: {
    readonly due: number;
    readonly id: string;
    readonly title: string;
  },
): void {
  reconcileTriageContribution(store, {
    filePath: "Trail/Collections/Triage.md",
    issuesById: {
      [issue.id]: {
        context: "triage",
        due: issue.due,
        id: issue.id,
        labelIds: [],
        title: issue.title,
      },
    },
    sourceByIssueId: {
      [issue.id]: {
        endOffset: 10,
        filePath: "Trail/Collections/Triage.md",
        markerEndOffset: 8,
        markerStartOffset: 4,
        startOffset: 0,
      },
    },
  });
}

describe("Formal Trail Triage UI", () => {
  it("shows initialization state before the Formal application is ready", () => {
    const store = createTrailRuntimeStore();

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("not available");
        }}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading Trail");
  });

  it("keeps the input as local draft state and clears it once capture is accepted", () => {
    const store = readyStore();
    const onCapture = vi.fn((title: string): TriageCaptureReceipt => ({
      completion: Promise.resolve(),
      issue: {
        context: "triage",
        due: 20,
        id: "captured",
        labelIds: [],
        title,
      },
    }));

    render(<TrailApp {...unusedManagementProps()} onCapture={onCapture} runtimeStore={store} />);

    const input = screen.getByPlaceholderText("What needs your attention?");
    fireEvent.change(input, { target: { value: "Review parser" } });
    fireEvent.submit(input.closest("form")!);

    expect(onCapture).toHaveBeenCalledWith("Review parser");
    expect(input).toHaveValue("");
  });

  it("renders the central optimistic projection before it becomes committed", () => {
    const store = readyStore();
    addPendingPlan(store, {
      commandId: "command-a",
      issue: {
        context: "triage",
        due: Date.UTC(2026, 7, 20, 8),
        id: "pending",
        labelIds: [],
        title: "Optimistic capture",
      },
      kind: "create-triage-issue",
    });

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("unused");
        }}
        runtimeStore={store}
      />,
    );

    const row = screen.getByText("Optimistic capture").closest("li");
    expect(row).toHaveAttribute("data-pending", "true");

    act(() => {
      reconcileTriageContribution(store, {
        filePath: "Trail/Collections/Triage.md",
        issuesById: {
          pending: {
            context: "triage",
            due: Date.UTC(2026, 7, 20, 8),
            id: "pending",
            labelIds: [],
            title: "Optimistic capture",
          },
        },
        sourceByIssueId: {
          pending: {
            endOffset: 10,
            filePath: "Trail/Collections/Triage.md",
            markerEndOffset: 8,
            markerStartOffset: 4,
            startOffset: 0,
          },
        },
      });
      removePendingPlan(store, "command-a");
    });

    expect(screen.getByText("Optimistic capture").closest("li"))
      .not.toHaveAttribute("data-pending");
  });

  it("keeps last-known-good rows visible but pauses capture when Triage is invalid", () => {
    const store = readyStore();
    reconcileTriageContribution(store, {
      filePath: "Trail/Collections/Triage.md",
      issuesById: {
        safe: {
          context: "triage",
          due: 10,
          id: "safe",
          labelIds: [],
          title: "Known good",
        },
      },
      sourceByIssueId: {
        safe: {
          endOffset: 10,
          filePath: "Trail/Collections/Triage.md",
          markerEndOffset: 8,
          markerStartOffset: 4,
          startOffset: 0,
        },
      },
    });
    setSourceIssuesForPath(store, "Trail/Collections/Triage.md", [{
      code: "invalid-due",
      filePath: "Trail/Collections/Triage.md",
      message: "due is missing",
      scope: "record",
    }]);

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("must not capture");
        }}
        runtimeStore={store}
      />,
    );

    expect(screen.getByText("Known good")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "showing the last known good state",
    );
    expect(screen.getByPlaceholderText("What needs your attention?")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Defer 7 days" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("surfaces an asynchronous persistence failure without restoring the local draft", async () => {
    const store = readyStore();
    let rejectCompletion: ((error: Error) => void) | undefined;
    const completion = new Promise<void>((_resolve, reject) => {
      rejectCompletion = reject;
    });
    const onCapture = (): TriageCaptureReceipt => ({
      completion,
      issue: {
        context: "triage",
        due: 20,
        id: "captured",
        labelIds: [],
        title: "Captured",
      },
    });

    render(<TrailApp {...unusedManagementProps()} onCapture={onCapture} runtimeStore={store} />);

    const input = screen.getByPlaceholderText("What needs your attention?");
    fireEvent.change(input, { target: { value: "Captured" } });
    fireEvent.submit(input.closest("form")!);

    await act(async () => {
      rejectCompletion?.(new Error("Disk verification failed"));
      await completion.catch(() => undefined);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Disk verification failed");
    expect(input).toHaveValue("");
  });

  it("edits title and Due through explicit row controls", () => {
    const store = readyStore();
    const due = Date.UTC(2026, 7, 20, 8);
    seedIssue(store, { due, id: "issue-a", title: "Original" });
    const onEdit = vi.fn((
      _issue: TrailTriageIssue,
      _title: string,
      _due: string,
    ): TriageManagementReceipt => ({
      completion: Promise.resolve(),
      issueId: "issue-a",
    }));

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("unused");
        }}
        onEdit={onEdit}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const title = screen.getByLabelText("Title");
    const dueInput = screen.getByLabelText("Due (UTC)");
    expect(title).toHaveValue("Original");
    expect(dueInput).toHaveValue("2026-08-20T08:00");

    fireEvent.change(title, { target: { value: "Edited" } });
    fireEvent.change(dueInput, { target: { value: "2026-08-21T09:15" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "issue-a", title: "Original", due }),
      "Edited",
      "2026-08-21T09:15",
    );
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("defers with one action and requires explicit confirmation before delete", () => {
    const store = readyStore();
    seedIssue(store, { due: 20, id: "issue-a", title: "Managed" });
    const onDefer = vi.fn((_issue: TrailTriageIssue): TriageManagementReceipt => ({
      completion: Promise.resolve(),
      issueId: "issue-a",
    }));
    const onDelete = vi.fn((_issue: TrailTriageIssue): TriageManagementReceipt => ({
      completion: Promise.resolve(),
      issueId: "issue-a",
    }));

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("unused");
        }}
        onDefer={onDefer}
        onDelete={onDelete}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Defer 7 days" }));
    expect(onDefer).toHaveBeenCalledWith(expect.objectContaining({ id: "issue-a" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "issue-a" }));
  });

  it("disables row management while that Issue has an optimistic mutation", () => {
    const store = readyStore();
    seedIssue(store, { due: 20, id: "issue-a", title: "Managed" });
    const expectedIssue = store.getState().committed.triageIssuesById["issue-a"];
    addPendingPlan(store, {
      commandId: "edit-a",
      expectedIssue,
      issue: { ...expectedIssue, title: "Pending edit" },
      kind: "update-triage-issue",
    });

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("unused");
        }}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Defer 7 days" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

});

describe("Formal Trail Workflow Entry UI", () => {
  function seedWorkflowProject(
    store: ReturnType<typeof readyStore>,
  ): {
    readonly issue: TrailWorkflowIssue;
    readonly project: TrailProject;
  } {
    const configuration = store.getState().committed.configuration;
    if (configuration === null) throw new Error("missing configuration");
    const project: TrailProject = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: configuration.statuses.project.unstarted.defaultId,
      title: "Workflow Project",
    };
    const issue: TrailWorkflowIssue = {
      context: "workflow",
      createdAt: 100,
      id: "workflow-issue-a",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: configuration.statuses.issue.backlog.defaultId,
      title: "Implement flow",
    };
    reconcileProjectContribution(store, {
      filePath: "Trail/Projects/0001 Workflow Project.md",
      issuesById: { [issue.id]: issue },
      project,
      sourceByIssueId: {
        [issue.id]: {
          endOffset: 20,
          filePath: "Trail/Projects/0001 Workflow Project.md",
          markerEndOffset: 12,
          markerStartOffset: 8,
          startOffset: 4,
        },
      },
    });
    return { issue, project };
  }

  it("opens Projects and submits a new Project through the Workflow action", () => {
    const store = readyStore();
    const onCreateProject = vi.fn((_title: string): WorkflowEntryReceipt => ({
      completion: Promise.resolve(),
      entityId: "project-new",
    }));

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("unused");
        }}
        onCreateProject={onCreateProject}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    const input = screen.getByPlaceholderText("Create an outcome-focused Project");
    fireEvent.change(input, { target: { value: "Ship Workflow Entry" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    expect(onCreateProject).toHaveBeenCalledWith("Ship Workflow Entry");
    expect(input).toHaveValue("");
  });

  it("creates a Workflow Issue inside the selected Project", () => {
    const store = readyStore();
    seedWorkflowProject(store);
    const onCreateWorkflowIssue = vi.fn((
      _projectId: string,
      _title: string,
    ): WorkflowEntryReceipt => ({
      completion: Promise.resolve(),
      entityId: "workflow-issue-new",
    }));

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("unused");
        }}
        onCreateWorkflowIssue={onCreateWorkflowIssue}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    const input = screen.getByPlaceholderText("Add a Workflow Issue");
    fireEvent.change(input, { target: { value: "Verify lifecycle" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Issue" }));

    expect(onCreateWorkflowIssue).toHaveBeenCalledWith(
      "project-a",
      "Verify lifecycle",
    );
    expect(input).toHaveValue("");
  });

  it("uses the Planner NeedsInput result to request Estimate before Completed", () => {
    const store = readyStore();
    const { issue } = seedWorkflowProject(store);
    const configuration = store.getState().committed.configuration;
    if (configuration === null) throw new Error("missing configuration");
    const completedId = configuration.statuses.issue.completed.defaultId;
    const onWorkflowStatusChange = vi.fn((
      expectedIssue: TrailWorkflowIssue,
      targetStatusDefinitionId: string,
      estimate?: number,
    ): WorkflowEntryReceipt => {
      if (targetStatusDefinitionId === completedId && estimate === undefined) {
        throw new WorkflowNeedsInputError(
          "estimate",
          "Estimate is required before completing this Workflow Issue",
        );
      }
      return {
        completion: Promise.resolve(),
        entityId: expectedIssue.id,
      };
    });

    render(
      <TrailApp
        {...unusedManagementProps()}
        onCapture={() => {
          throw new Error("unused");
        }}
        onWorkflowStatusChange={onWorkflowStatusChange}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    fireEvent.change(screen.getByLabelText(`Status for ${issue.title}`), {
      target: { value: completedId },
    });

    expect(screen.getByText("Estimate required to complete")).toBeInTheDocument();
    const estimate = screen.getByRole("spinbutton");
    fireEvent.change(estimate, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    expect(onWorkflowStatusChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: issue.id }),
      completedId,
    );
    expect(onWorkflowStatusChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: issue.id }),
      completedId,
      3,
    );
  });
});
