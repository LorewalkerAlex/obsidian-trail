import { describe, expect, it } from "vitest";

import {
  createTrailMutationPlan,
  projectMutationEntity,
  triageIssueMutationEntity,
  workflowIssueMutationEntity,
} from "../plans/trail-mutation-plan";
import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { materializeTrailSourceTransitionPlan } from "./trail-source-transition-plan";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-open",
  title: "Project",
};
const source = {
  context: "triage" as const,
  due: 1,
  id: "triage-a",
  labelIds: [],
  title: "Source",
};
const target = {
  context: "workflow" as const,
  createdAt: 2,
  id: "workflow-a",
  labelIds: [],
  projectId: project.id,
  statusDefinitionId: "issue-backlog",
  title: "Source",
};

function committed() {
  const store = createTrailRuntimeStore();
  store.setState((state) => ({
    committed: {
      ...state.committed,
      authoritative: {
        ...state.committed.authoritative,
        domain: {
          ...state.committed.authoritative.domain,
          issuesById: { [source.id]: source },
          projectsById: { [project.id]: project },
        },
      },
      ownership: {
        sourceByEntityId: {
          [project.id]: "Trail/Projects/0001 Project.md",
          [source.id]: "Trail/Collections/Triage.md",
        },
        sourceEntityIdsByPath: {
          "Trail/Collections/Triage.md": [source.id],
          "Trail/Projects/0001 Project.md": [project.id],
        },
      },
      revision: 1,
    },
  }));
  return store.getState().committed;
}

describe("Trail Source Transition physical plan", () => {
  it(
    "materializes target and source at dequeue time and derives safe target compensation",
    async () => {
      const logicalPlan = createTrailMutationPlan({
        commandId: "command-a",
        effects: [
          { after: workflowIssueMutationEntity(target), kind: "create" },
          { before: triageIssueMutationEntity(source), kind: "delete" },
        ],
        intent: "triage.accept",
        preconditions: [
          { entity: projectMutationEntity(project), kind: "entity-equals" },
        ],
      });

      const physical = await materializeTrailSourceTransitionPlan(
        logicalPlan,
        committed(),
      );

      expect(physical.target).toMatchObject({
        operation: { kind: "workflow-create", issue: target },
        sourcePath: "Trail/Projects/0001 Project.md",
      });
      expect(physical.source).toMatchObject({
        operation: { kind: "triage-delete", expectedIssue: source },
        sourcePath: "Trail/Collections/Triage.md",
      });
      expect(physical.compensation).toMatchObject({
        operation: { kind: "workflow-delete", expectedIssue: target },
        sourcePath: "Trail/Projects/0001 Project.md",
      });
    },
  );

  it("rejects a topology that is not the active create-target/delete-source form", async () => {
    const logicalPlan = createTrailMutationPlan({
      commandId: "command-a",
      effects: [{ after: workflowIssueMutationEntity(target), kind: "create" }],
      intent: "not-a-transition",
      preconditions: [
        { entity: projectMutationEntity(project), kind: "entity-equals" },
      ],
    });

    await expect(materializeTrailSourceTransitionPlan(
      logicalPlan,
      committed(),
    )).rejects.toThrow("one Create target and one Delete source");
  });
});
