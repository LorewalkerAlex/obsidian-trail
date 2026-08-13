import { describe, expect, it } from "vitest";

import {
  addPendingPlan,
  createTrailRuntimeStore,
  reconcileTriageContribution,
  removePendingPlan,
  selectEffectiveTriageIssueById,
  selectEffectiveTriageIssueIds,
  selectIsTriageIssuePending,
  selectSourceIssuesForPath,
  setTrailRuntimeAvailability,
} from "./trail-runtime";
import type { TrailTriageContribution } from "./trail-triage-markdown";

function contribution(
  issues: readonly {
    due: number;
    id: string;
    title: string;
  }[],
): TrailTriageContribution {
  const issuesById: Record<string, {
    context: "triage";
    due: number;
    id: string;
    labelIds: readonly string[];
    title: string;
  }> = {};
  const sourceByIssueId: Record<string, {
    endOffset: number;
    filePath: string;
    markerEndOffset: number;
    markerStartOffset: number;
    startOffset: number;
  }> = {};

  for (const issue of issues) {
    issuesById[issue.id] = {
      context: "triage",
      due: issue.due,
      id: issue.id,
      labelIds: [],
      title: issue.title,
    };
    sourceByIssueId[issue.id] = {
      endOffset: 10,
      filePath: "Trail/Collections/Triage.md",
      markerEndOffset: 8,
      markerStartOffset: 4,
      startOffset: 0,
    };
  }

  return {
    filePath: "Trail/Collections/Triage.md",
    issuesById,
    sourceByIssueId,
  };
}

describe("Formal Runtime Triage projection", () => {
  it("tracks application availability without mixing it into committed Domain state", () => {
    const store = createTrailRuntimeStore();

    expect(store.getState().availability).toEqual({ kind: "idle" });

    setTrailRuntimeAvailability(store, { kind: "initializing" });
    reconcileTriageContribution(store, contribution([]));
    setTrailRuntimeAvailability(store, {
      kind: "ready",
      timezone: "Asia/Shanghai",
    });

    expect(store.getState().availability).toEqual({
      kind: "ready",
      timezone: "Asia/Shanghai",
    });
    expect(store.getState().committed.revision).toBe(1);
  });

  it("reuses one empty source-issue snapshot for missing paths", () => {
    const store = createTrailRuntimeStore();

    const first = selectSourceIssuesForPath(
      store.getState(),
      "Trail/Collections/Triage.md",
    );

    expect(first).toEqual([]);
    expect(selectSourceIssuesForPath(
      store.getState(),
      "Trail/Collections/Triage.md",
    )).toBe(first);
    expect(selectSourceIssuesForPath(store.getState(), undefined)).toBe(first);
  });

  it("normalizes committed state, sorts by Due, and preserves unchanged objects", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, contribution([
      { due: 20, id: "b", title: "Later" },
      { due: 10, id: "a", title: "Sooner" },
    ]));

    const firstA = store.getState().committed.triageIssuesById.a;
    expect(store.getState().committed.triageIssueIds).toEqual(["a", "b"]);

    reconcileTriageContribution(store, contribution([
      { due: 10, id: "a", title: "Sooner" },
      { due: 30, id: "b", title: "Changed" },
    ]));

    expect(store.getState().committed.triageIssuesById.a).toBe(firstA);
    expect(store.getState().committed.triageIssuesById.b.title).toBe("Changed");
  });

  it("projects pending creates centrally before they are committed", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, contribution([
      { due: 20, id: "committed", title: "Committed" },
    ]));

    addPendingPlan(store, {
      commandId: "command-a",
      issue: {
        context: "triage",
        due: 10,
        id: "pending",
        labelIds: [],
        title: "Pending",
      },
      kind: "create-triage-issue",
    });

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual([
      "pending",
      "committed",
    ]);
    expect(selectEffectiveTriageIssueById(
      store.getState(),
      "pending",
    )?.title).toBe("Pending");
    expect(selectIsTriageIssuePending(store.getState(), "pending")).toBe(true);
    expect(store.getState().committed.triageIssuesById.pending).toBeUndefined();
  });

  it("removes one failed plan while replaying later pending plans", () => {
    const store = createTrailRuntimeStore();
    addPendingPlan(store, {
      commandId: "first",
      issue: {
        context: "triage",
        due: 20,
        id: "first-issue",
        labelIds: [],
        title: "First",
      },
      kind: "create-triage-issue",
    });
    addPendingPlan(store, {
      commandId: "second",
      issue: {
        context: "triage",
        due: 10,
        id: "second-issue",
        labelIds: [],
        title: "Second",
      },
      kind: "create-triage-issue",
    });

    removePendingPlan(store, "first");

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual([
      "second-issue",
    ]);
    expect(store.getState().pendingPlans.map((plan) => plan.commandId)).toEqual([
      "second",
    ]);
  });

  it("projects pending updates centrally and reorders by the optimistic Due", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, contribution([
      { due: 10, id: "a", title: "A" },
      { due: 20, id: "b", title: "B" },
    ]));
    const expectedIssue = store.getState().committed.triageIssuesById.b;

    addPendingPlan(store, {
      commandId: "edit-b",
      expectedIssue,
      issue: {
        ...expectedIssue,
        due: 5,
        title: "B edited",
      },
      kind: "update-triage-issue",
    });

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual(["b", "a"]);
    expect(selectEffectiveTriageIssueById(store.getState(), "b")?.title).toBe(
      "B edited",
    );
    expect(selectIsTriageIssuePending(store.getState(), "b")).toBe(true);
    expect(store.getState().committed.triageIssuesById.b.title).toBe("B");
  });

  it("projects pending deletes centrally and restores the row when the plan is removed", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, contribution([
      { due: 10, id: "a", title: "A" },
    ]));
    const expectedIssue = store.getState().committed.triageIssuesById.a;

    addPendingPlan(store, {
      commandId: "delete-a",
      expectedIssue,
      issueId: "a",
      kind: "delete-triage-issue",
    });

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual([]);
    expect(selectEffectiveTriageIssueById(store.getState(), "a")).toBeUndefined();
    expect(selectIsTriageIssuePending(store.getState(), "a")).toBe(true);

    removePendingPlan(store, "delete-a");

    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual(["a"]);
    expect(selectEffectiveTriageIssueById(store.getState(), "a")?.title).toBe("A");
  });

  it("returns entity and field-level reconcile differences without field values", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, contribution([
      { due: 10, id: "a", title: "A" },
      { due: 20, id: "b", title: "B" },
    ]));

    const result = reconcileTriageContribution(store, contribution([
      { due: 11, id: "a", title: "A edited" },
      { due: 30, id: "c", title: "C" },
    ]));

    expect(result.diff).toEqual({
      addedIds: ["c"],
      changedFieldsById: { a: ["due", "title"] },
      changedIds: ["a"],
      removedIds: ["b"],
    });
  });

});
