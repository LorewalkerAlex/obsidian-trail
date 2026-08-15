import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createTrailMutationPlan,
  triageIssueMutationEntity,
} from "../../../mutation/plans/trail-mutation-plan";
import { addTrailPendingPlan } from "../../../runtime/projection/trail-runtime-projection";
import { setSourceIssuesForPath } from "../../../runtime/store/trail-runtime-store";
import type { TrailTriageIssue } from "../../../domain/trail-issue";
import type { TriageCaptureReceipt } from "../../../application/triage/trail-triage-intake";
import type { TriageManagementReceipt } from "../../../application/triage/trail-triage-management";
import {
  createReadyTrailUiStore,
  seedTriageIssue,
  seedWorkflowProject,
} from "../../test/trail-ui-test-fixtures";
import {
  TrailTriagePage,
  type TrailTriagePageProps,
} from "./trail-triage-page";

function unusedActions(): Omit<
  TrailTriagePageProps,
  "runtimeStore" | "timezone"
> {
  const unused = (): never => {
    throw new Error("action is unused");
  };
  return {
    onCapture: unused,
    onDefer: unused,
    onDelete: unused,
    onEdit: unused,
  };
}

function renderPage(
  overrides: Partial<Omit<TrailTriagePageProps, "runtimeStore" | "timezone">> = {},
) {
  const store = createReadyTrailUiStore();
  render(
    <TrailTriagePage
      {...unusedActions()}
      {...overrides}
      runtimeStore={store}
      timezone="UTC"
    />,
  );
  return store;
}

describe("TrailTriagePage", () => {
  it("keeps capture text as local draft and clears it once the action is accepted", () => {
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
    renderPage({ onCapture });

    const input = screen.getByPlaceholderText("What needs your attention?");
    fireEvent.change(input, { target: { value: "Review parser" } });
    fireEvent.submit(input.closest("form")!);

    expect(onCapture).toHaveBeenCalledWith("Review parser");
    expect(input).toHaveValue("");
  });

  it("renders pending presentation from the central optimistic projection", () => {
    const store = createReadyTrailUiStore();
    const issue: TrailTriageIssue = {
      context: "triage",
      due: Date.UTC(2026, 7, 20, 8),
      id: "pending",
      labelIds: [],
      title: "Optimistic capture",
    };
    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "command-a",
      effects: [{
        after: triageIssueMutationEntity(issue),
        kind: "create",
      }],
      intent: "test.optimistic-capture",
    }));

    render(
      <TrailTriagePage
        {...unusedActions()}
        runtimeStore={store}
        timezone="UTC"
      />,
    );

    expect(screen.getByText("Optimistic capture").closest("li"))
      .toHaveAttribute("data-pending", "true");
  });

  it("keeps last-known-good rows visible but pauses actions when Triage is invalid", () => {
    const store = createReadyTrailUiStore();
    seedTriageIssue(store, { due: 10, id: "safe", title: "Known good" });
    setSourceIssuesForPath(store, "Trail/Collections/Triage.md", [{
      code: "invalid-due",
      filePath: "Trail/Collections/Triage.md",
      message: "due is missing",
      scope: "record",
    }]);

    render(
      <TrailTriagePage
        {...unusedActions()}
        runtimeStore={store}
        timezone="UTC"
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

  it("surfaces an asynchronous capture failure without restoring the local draft", async () => {
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
    renderPage({ onCapture });

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
    const store = createReadyTrailUiStore();
    const due = Date.UTC(2026, 7, 20, 8);
    seedTriageIssue(store, { due, id: "issue-a", title: "Original" });
    const onEdit = vi.fn((
      _issue: TrailTriageIssue,
      _title: string,
      _due: string,
    ): TriageManagementReceipt => ({
      completion: Promise.resolve(),
      issueId: "issue-a",
    }));

    render(
      <TrailTriagePage
        {...unusedActions()}
        onEdit={onEdit}
        runtimeStore={store}
        timezone="UTC"
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

  it("accepts into an existing Project using the current source snapshot", () => {
    const store = createReadyTrailUiStore();
    const source = seedTriageIssue(store, {
      due: 5_000,
      id: "triage-a",
      title: "Captured work",
    });
    const { project } = seedWorkflowProject(store);
    const onAccept = vi.fn(() => ({
      completion: Promise.resolve(),
      sourceIssueId: source.id,
      targetIssueId: "workflow-b",
    }));

    render(
      <TrailTriagePage
        {...unusedActions()}
        onAccept={onAccept}
        runtimeStore={store}
        timezone="UTC"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(screen.getByLabelText("Accept into Project")).toHaveValue(project.id);
    fireEvent.click(screen.getByRole("button", { name: "Accept to Project" }));

    expect(onAccept).toHaveBeenCalledWith(source, project.id);
    expect(screen.queryByRole("button", { name: "Accept to Project" })).toBeNull();
  });

  it("defers with one action and requires explicit confirmation before delete", () => {
    const store = createReadyTrailUiStore();
    seedTriageIssue(store, { due: 20, id: "issue-a", title: "Managed" });
    const onDefer = vi.fn((_issue: TrailTriageIssue): TriageManagementReceipt => ({
      completion: Promise.resolve(),
      issueId: "issue-a",
    }));
    const onDelete = vi.fn((_issue: TrailTriageIssue): TriageManagementReceipt => ({
      completion: Promise.resolve(),
      issueId: "issue-a",
    }));

    render(
      <TrailTriagePage
        {...unusedActions()}
        onDefer={onDefer}
        onDelete={onDelete}
        runtimeStore={store}
        timezone="UTC"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Defer 7 days" }));
    expect(onDefer).toHaveBeenCalledWith(expect.objectContaining({ id: "issue-a" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "issue-a" }));
  });

  it("disables row actions while that Issue has an optimistic mutation", () => {
    const store = createReadyTrailUiStore();
    const issue = seedTriageIssue(store, {
      due: 20,
      id: "issue-a",
      title: "Managed",
    });
    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "edit-a",
      effects: [{
        after: triageIssueMutationEntity({ ...issue, title: "Pending edit" }),
        before: triageIssueMutationEntity(issue),
        kind: "replace",
      }],
      intent: "test.pending-edit",
    }));

    render(
      <TrailTriagePage
        {...unusedActions()}
        runtimeStore={store}
        timezone="UTC"
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Defer 7 days" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
