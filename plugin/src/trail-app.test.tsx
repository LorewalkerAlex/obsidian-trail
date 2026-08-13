import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  addPendingPlan,
  createTrailRuntimeStore,
  reconcileTriageContribution,
  removePendingPlan,
  setTrailRuntimeAvailability,
} from "./domain/trail-runtime";
import type { TriageCaptureReceipt } from "./domain/trail-triage-intake";
import { TrailApp } from "./trail-app";

function readyStore() {
  const store = createTrailRuntimeStore();
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

describe("Formal Trail Triage UI", () => {
  it("shows initialization state before the Formal application is ready", () => {
    const store = createTrailRuntimeStore();

    render(
      <TrailApp
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

    render(<TrailApp onCapture={onCapture} runtimeStore={store} />);

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
    store.setState((state) => ({
      ...state,
      committed: {
        ...state.committed,
        sourceIssues: [{
          code: "invalid-due",
          filePath: "Trail/Collections/Triage.md",
          message: "due is missing",
          scope: "record",
        }],
      },
    }));

    render(
      <TrailApp
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

    render(<TrailApp onCapture={onCapture} runtimeStore={store} />);

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
});
