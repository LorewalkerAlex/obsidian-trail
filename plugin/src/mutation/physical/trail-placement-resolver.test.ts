import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import {
  cycleMutationEntity,
  initiativeMutationEntity,
  milestoneMutationEntity,
  projectMutationEntity,
  triageIssueMutationEntity,
  workflowIssueMutationEntity,
} from "../plans/trail-mutation-plan";
import { resolveTrailEntityPlacement } from "./trail-placement-resolver";

function runtimeWithOwnership() {
  const store = createTrailRuntimeStore();
  store.setState((state) => ({
    ...state,
    committed: {
      ...state.committed,
      sourceByEntityId: {
        "project-a": "Trail/Projects/0001 Alpha.md",
        "workflow-existing": "Trail/Projects/0001 Alpha.md",
      },
      sourceEntityIdsByPath: {
        "Trail/Projects/0001 Alpha.md": ["project-a", "workflow-existing"],
      },
    },
  }));
  return store.getState().committed;
}

describe("Trail placement resolver", () => {
  it("uses the fixed Triage singleton for a new Triage Issue", async () => {
    const path = await resolveTrailEntityPlacement(
      triageIssueMutationEntity({
        context: "triage",
        due: 10,
        id: "triage-new",
        labelIds: [],
        title: "Capture",
      }),
      runtimeWithOwnership(),
    );
    expect(path).toBe("Trail/Collections/Triage.md");
  });

  it("uses the owning Project source for a new Workflow Issue", async () => {
    const path = await resolveTrailEntityPlacement(
      workflowIssueMutationEntity({
        context: "workflow",
        createdAt: 10,
        id: "workflow-new",
        labelIds: [],
        projectId: "project-a",
        statusDefinitionId: "status-backlog",
        title: "Work",
      }),
      runtimeWithOwnership(),
    );
    expect(path).toBe("Trail/Projects/0001 Alpha.md");
  });

  it("delegates a new Project filename to the file-backed allocator", async () => {
    const project = {
      id: "project-new",
      labelIds: [],
      statusDefinitionId: "status-unstarted",
      title: "New Project",
    };
    const path = await resolveTrailEntityPlacement(
      projectMutationEntity(project),
      runtimeWithOwnership(),
      { allocateProjectPath: async (value) => `allocated/${value.title}.md` },
    );
    expect(path).toBe("allocated/New Project.md");
  });

  it("resolves Milestone and Cycle carriers from frozen physical ownership", async () => {
    const committed = runtimeWithOwnership();
    await expect(resolveTrailEntityPlacement(
      milestoneMutationEntity({
        id: "milestone-new",
        projectId: "project-a",
        title: "Checkpoint",
      }),
      committed,
    )).resolves.toBe("Trail/Projects/0001 Alpha.md");

    await expect(resolveTrailEntityPlacement(
      cycleMutationEntity({
        id: "cycle-new",
        issueIds: [],
        plannedEnd: 20,
        startedAt: 10,
      }),
      committed,
    )).resolves.toBe("Trail/Collections/Cycles.md");
  });

  it(
    "requires an injected Initiative allocator until Initiative behavior is activated",
    async () => {
      const initiative = initiativeMutationEntity({
        id: "initiative-new",
        labelIds: [],
        title: "Long Goal",
      });
      await expect(resolveTrailEntityPlacement(
        initiative,
        runtimeWithOwnership(),
      )).rejects.toThrow(/Initiative .*path allocator/);
      await expect(resolveTrailEntityPlacement(
        initiative,
        runtimeWithOwnership(),
        { allocateInitiativePath: async (value) => `allocated/${value.title}.md` },
      )).resolves.toBe("allocated/Long Goal.md");
    },
  );
});
