import { describe, expect, it, vi } from "vitest";

import type { TrailProject } from "../../domain/model/trail-entities";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type {
  TrailPersistedPluginDataSnapshot,
  TrailPluginDataSnapshot,
} from "../../persistence/plugin-data/trail-plugin-data-codec";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  recoverMissingTrailDefaultProject,
  TrailDefaultProjectRecoveryError,
} from "./trail-default-project-recovery";

function persistedWithoutDefault(): TrailPersistedPluginDataSnapshot {
  const workspace = createTrailTestWorkspaceState("project-old");
  const { defaultProjectId: _defaultProjectId, ...workspaceState } = workspace;
  return {
    configuration: createTrailTestConfiguration(),
    workspaceState,
  };
}

function acceptedProject(path: string, project: TrailProject) {
  return {
    issues: [],
    kind: "accepted" as const,
    snapshot: {
      issues: [],
      kind: "project" as const,
      milestones: [],
      project,
      sourcePath: path,
    },
  };
}

function pluginDataRepository() {
  const save = vi.fn(async (snapshot: TrailPluginDataSnapshot) => snapshot);
  return {
    repository: { save } as unknown as TrailPluginDataRepository,
    save,
  };
}

describe("Default Project startup recovery", () => {
  it("adopts the valid reserved 0000 Project carrier regardless of its current title", async () => {
    const path = "Trail/Projects/0000 Renamed.md";
    const project: TrailProject = {
      id: "project-renamed",
      labelIds: [],
      statusDefinitionId: "project-started",
      title: "Renamed",
    };
    const domainSources = {
      list: vi.fn(async () => [{ kind: "file" as const, name: "0000 Renamed.md", path }]),
      read: vi.fn(async () => acceptedProject(path, project)),
      create: vi.fn(),
    } as unknown as TrailDomainSourceRepository;
    const pluginData = pluginDataRepository();

    const result = await recoverMissingTrailDefaultProject({
      createId: () => "unused",
      domainSources,
      pluginData: pluginData.repository,
      snapshot: persistedWithoutDefault(),
    });

    expect(result.workspaceState.defaultProjectId).toBe(project.id);
    expect(domainSources.create).not.toHaveBeenCalled();
    expect(pluginData.save).toHaveBeenCalledTimes(1);
    const saved = pluginData.save.mock.calls[0]?.[0];
    expect(saved?.workspaceState.defaultProjectId).toBe(project.id);
  });

  it("creates a normal Standalone Project at reserved sequence 0000 when that carrier is absent", async () => {
    const path = "Trail/Projects/0000 Standalone.md";
    const created: TrailProject = {
      id: "project-created",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Standalone",
    };
    const domainSources = {
      list: vi.fn(async () => []),
      create: vi.fn(async (_kind: string, createdPath: string) => acceptedProject(createdPath, created)),
    } as unknown as TrailDomainSourceRepository;
    const pluginData = pluginDataRepository();

    const result = await recoverMissingTrailDefaultProject({
      createId: () => created.id,
      domainSources,
      pluginData: pluginData.repository,
      snapshot: persistedWithoutDefault(),
    });

    expect(result.workspaceState.defaultProjectId).toBe(created.id);
    expect(domainSources.create).toHaveBeenCalledWith(
      "project",
      path,
      expect.stringContaining(created.id),
    );
  });

  it("fails closed instead of overwriting an invalid reserved Project carrier", async () => {
    const path = "Trail/Projects/0000 Broken.md";
    const domainSources = {
      list: vi.fn(async () => [{ kind: "file" as const, name: "0000 Broken.md", path }]),
      read: vi.fn(async () => ({ issues: [], kind: "rejected" as const })),
      create: vi.fn(),
    } as unknown as TrailDomainSourceRepository;
    const pluginData = pluginDataRepository();

    await expect(recoverMissingTrailDefaultProject({
      createId: () => "project-created",
      domainSources,
      pluginData: pluginData.repository,
      snapshot: persistedWithoutDefault(),
    })).rejects.toBeInstanceOf(TrailDefaultProjectRecoveryError);
    expect(domainSources.create).not.toHaveBeenCalled();
    expect(pluginData.save).not.toHaveBeenCalled();
  });
});
