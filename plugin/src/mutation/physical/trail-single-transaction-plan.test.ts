import { describe, expect, it } from "vitest";

import {
  createTrailMutationPlan,
  projectMutationEntity,
  triageIssueMutationEntity,
  workflowIssueMutationEntity,
} from "../plans/trail-mutation-plan";
import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { materializeTrailSingleTransactionPlan } from "./trail-single-transaction-plan";

function committed() {
  const store = createTrailRuntimeStore();
  store.setState((state) => ({
    ...state,
    committed: {
      ...state.committed,
      sourceByEntityId: { "project-a": "Trail/Projects/0001 Alpha.md" },
      sourceEntityIdsByPath: {
        "Trail/Projects/0001 Alpha.md": ["project-a"],
      },
    },
  }));
  return store.getState().committed;
}

describe("Trail single transaction physical planner", () => {
  it("materializes a Triage create to the singleton source", async () => {
    const issue = {
      context: "triage" as const,
      due: 20,
      id: "triage-a",
      labelIds: [],
      title: "Capture",
    };
    const logical = createTrailMutationPlan({
      commandId: "command-a",
      effects: [{ after: triageIssueMutationEntity(issue), kind: "create" }],
      intent: "triage.issue.create",
    });
    await expect(materializeTrailSingleTransactionPlan(logical, committed())).resolves.toEqual({
      commandId: "command-a",
      intent: "triage.issue.create",
      operation: { issue, kind: "triage-create" },
      sourcePath: "Trail/Collections/Triage.md",
    });
  });

  it("materializes Workflow create from logical Project precondition and ownership", async () => {
    const project = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Alpha",
    };
    const issue = {
      context: "workflow" as const,
      createdAt: 10,
      id: "workflow-a",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-backlog",
      title: "Work",
    };
    const logical = createTrailMutationPlan({
      commandId: "command-b",
      effects: [{ after: workflowIssueMutationEntity(issue), kind: "create" }],
      intent: "workflow.issue.create",
      preconditions: [{ entity: projectMutationEntity(project), kind: "entity-equals" }],
    });
    const physical = await materializeTrailSingleTransactionPlan(logical, committed());
    expect(physical.sourcePath).toBe("Trail/Projects/0001 Alpha.md");
    expect(physical.operation).toEqual({ expectedProject: project, issue, kind: "workflow-create" });
  });

  it("rejects multi-effect logical plans because they require another topology", async () => {
    const first = triageIssueMutationEntity({
      context: "triage",
      due: 10,
      id: "a",
      labelIds: [],
      title: "A",
    });
    const second = triageIssueMutationEntity({
      context: "triage",
      due: 20,
      id: "b",
      labelIds: [],
      title: "B",
    });
    const logical = createTrailMutationPlan({
      commandId: "command-c",
      effects: [
        { after: first, kind: "create" },
        { after: second, kind: "create" },
      ],
      intent: "test.multi",
    });
    await expect(materializeTrailSingleTransactionPlan(logical, committed())).rejects.toThrow(
      "exactly one logical effect",
    );
  });
});
