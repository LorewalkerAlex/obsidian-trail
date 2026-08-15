import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import { reconcileTriageContribution } from "./trail-runtime-reconciler";

function contribution(
  issues: readonly {
    due: number;
    id: string;
    title: string;
  }[],
) {
  return {
    filePath: "Trail/Collections/Triage.md",
    issuesById: Object.fromEntries(issues.map((issue) => [
      issue.id,
      {
        context: "triage" as const,
        due: issue.due,
        id: issue.id,
        labelIds: [],
        title: issue.title,
      },
    ])),
  };
}

describe("Trail Runtime reconciler", () => {
  it("normalizes Triage ordering and preserves unchanged entity objects", () => {
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

  it("reports entity and field-level reconcile differences without field values", () => {
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
