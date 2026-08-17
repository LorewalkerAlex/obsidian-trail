import { describe, expect, it } from "vitest";

import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import { executeTrailPersistenceTransaction } from "./trail-persistence-transaction-executor";

const path = "Trail/Projects/0001 Project A.md";
const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};

function environment(currentProject = project) {
  const events: string[] = [];
  const domainSources = {
    async deleteSource(sourcePath: string) {
      events.push(`delete:${sourcePath}`);
    },
    async read(_kind: string, sourcePath: string) {
      events.push(`read:${sourcePath}`);
      return {
        issues: [],
        kind: "accepted" as const,
        snapshot: {
          issues: [],
          kind: "project" as const,
          milestones: [],
          project: currentProject,
          sourcePath,
        },
      };
    },
  } as unknown as TrailDomainSourceRepository;
  const pluginData = {} as TrailPluginDataRepository;
  return { environment: { domainSources, pluginData }, events };
}

function rootDeletePlan() {
  return {
    commandId: "delete-project",
    intent: "workflow.project.delete",
    kind: "single" as const,
    operations: [{
      beforeEntities: [{ kind: "project" as const, value: project }],
      kind: "delete-domain-source" as const,
      path,
      sourceKind: "project" as const,
    }],
  };
}

describe("Trail root Domain source deletion", () => {
  it("rereads and verifies the authoritative source before deleting the file", async () => {
    const harness = environment();

    const result = await executeTrailPersistenceTransaction(
      rootDeletePlan(),
      harness.environment,
    );

    expect(result.topology).toBe("single");
    expect(harness.events).toEqual([`read:${path}`, `delete:${path}`]);
  });

  it("refuses root deletion when the authoritative source changed after materialization", async () => {
    const harness = environment({ ...project, title: "Externally changed" });

    await expect(executeTrailPersistenceTransaction(
      rootDeletePlan(),
      harness.environment,
    )).rejects.toThrow(`Domain source changed before delete: ${path}`);

    expect(harness.events).toEqual([`read:${path}`]);
  });
});
