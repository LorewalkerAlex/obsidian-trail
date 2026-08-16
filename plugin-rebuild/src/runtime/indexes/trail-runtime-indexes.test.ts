import { describe, expect, it } from "vitest";

import { createEmptyTrailDomainState } from "../store/trail-runtime-store";
import { buildTrailRuntimeIndexes } from "./trail-runtime-indexes";

describe("Trail runtime indexes", () => {
  it("materializes only the current issuesByProjectId index", () => {
    const domain = createEmptyTrailDomainState();
    const issuesById = new Map(domain.issuesById);
    issuesById.set("issue-b", {
      context: "workflow",
      createdAt: 1,
      id: "issue-b",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-unstarted",
      title: "B",
    });
    issuesById.set("issue-a", {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-unstarted",
      title: "A",
    });

    const indexes = buildTrailRuntimeIndexes({ ...domain, issuesById });
    expect(indexes.issuesByProjectId.get("project-a")).toEqual(["issue-a", "issue-b"]);
  });
});
