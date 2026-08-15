import { describe, expect, it } from "vitest";

import {
  createTrailRuntimeStore,
  setSourceIssuesForPath,
} from "../runtime/store/trail-runtime-store";
import {
  selectEntitySourceIssues,
  selectTriageSourceIssues,
  selectWorkflowRootSourceIssues,
  selectWorkflowSourceIssues,
} from "./trail-source-health";

function issue(filePath: string, code: string) {
  return {
    code,
    filePath,
    message: code,
    scope: "file" as const,
  };
}

describe("Trail source health queries", () => {
  it("narrows Triage and Workflow root issues without exposing paths to UI", () => {
    const store = createTrailRuntimeStore();
    setSourceIssuesForPath(
      store,
      "Trail/Collections/Triage.md",
      [issue("Trail/Collections/Triage.md", "triage-invalid")],
    );
    setSourceIssuesForPath(
      store,
      "Trail/Projects",
      [issue("Trail/Projects", "projects-root-invalid")],
    );

    expect(selectTriageSourceIssues(store.getState()).map((value) => value.code))
      .toEqual(["triage-invalid"]);
    expect(selectWorkflowRootSourceIssues(store.getState()).map((value) => value.code))
      .toEqual(["projects-root-invalid"]);
  });

  it("collects Workflow issues while excluding unrelated source issues", () => {
    const store = createTrailRuntimeStore();
    setSourceIssuesForPath(
      store,
      "Trail/Projects/0001 A.md",
      [issue("Trail/Projects/0001 A.md", "project-invalid")],
    );
    setSourceIssuesForPath(
      store,
      "Trail/Collections/Triage.md",
      [issue("Trail/Collections/Triage.md", "triage-invalid")],
    );

    expect(selectWorkflowSourceIssues(store.getState()).map((value) => value.code))
      .toEqual(["project-invalid"]);
  });

  it("resolves an entity source through Runtime ownership", () => {
    const store = createTrailRuntimeStore();
    store.setState((state) => ({
      committed: {
        ...state.committed,
        ownership: {
          ...state.committed.ownership,
          sourceByEntityId: {
            ...state.committed.ownership.sourceByEntityId,
            "project-a": "Trail/Projects/0001 A.md",
          },
        },
      },
    }));
    setSourceIssuesForPath(
      store,
      "Trail/Projects/0001 A.md",
      [issue("Trail/Projects/0001 A.md", "project-invalid")],
    );

    expect(selectEntitySourceIssues(store.getState(), "project-a").map((value) => value.code))
      .toEqual(["project-invalid"]);
  });
});
