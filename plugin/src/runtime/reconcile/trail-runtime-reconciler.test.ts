import { describe, expect, it } from "vitest";

import {
  selectEffectiveTriageIssueIds,
} from "../projection/trail-runtime-projection";
import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import {
  reconcileProjectContribution,
  reconcileTriageContribution,
} from "./trail-runtime-reconciler";

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
  it("normalizes Triage ordering while committed Domain keeps one unified Issue map", () => {
    const store = createTrailRuntimeStore();
    reconcileTriageContribution(store, contribution([
      { due: 20, id: "b", title: "Later" },
      { due: 10, id: "a", title: "Sooner" },
    ]));

    const firstA = store.getState().committed.authoritative.domain.issuesById.a;
    expect(selectEffectiveTriageIssueIds(store.getState())).toEqual(["a", "b"]);

    reconcileTriageContribution(store, contribution([
      { due: 10, id: "a", title: "Sooner" },
      { due: 30, id: "b", title: "Changed" },
    ]));

    expect(store.getState().committed.authoritative.domain.issuesById.a).toBe(firstA);
    expect(store.getState().committed.authoritative.domain.issuesById.b.title).toBe("Changed");
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

  it("keeps the Project relation index separate from authoritative Issue facts", () => {
    const store = createTrailRuntimeStore();
    const project = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-open",
      title: "Project A",
    } as const;
    const issue = {
      context: "workflow" as const,
      createdAt: 10,
      id: "issue-a",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-backlog",
      title: "Work",
    };

    reconcileProjectContribution(store, {
      filePath: "Trail/Projects/0001 Project A.md",
      issuesById: { [issue.id]: issue },
      project,
    });

    const committed = store.getState().committed;
    expect(committed.authoritative.domain.issuesById[issue.id]).toEqual(issue);
    expect(committed.indexes.issuesByProjectId).toEqual({
      [project.id]: [issue.id],
    });
    expect(committed.ownership.sourceByEntityId[issue.id]).toBe(
      "Trail/Projects/0001 Project A.md",
    );
  });
});
