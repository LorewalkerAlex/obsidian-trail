import type { Workspace, WorkspaceLeaf } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { createTrailInspectorStore } from "../../ui/shell/trail-inspector-state";
import {
  TrailInspectorHost,
  TRAIL_INSPECTOR_AUTO_REVEAL_MAIN_WIDTH,
  TRAIL_INSPECTOR_VIEW_TYPE,
} from "./trail-inspector-host";

type TestWorkspace = Pick<Workspace, "detachLeavesOfType" | "ensureSideLeaf">;

function createWorkspace(): {
  readonly detachLeavesOfType: ReturnType<typeof vi.fn>;
  readonly ensureSideLeaf: ReturnType<typeof vi.fn>;
  readonly workspace: TestWorkspace;
} {
  const detachLeavesOfType = vi.fn();
  const ensureSideLeaf = vi.fn(async () => ({} as WorkspaceLeaf));
  return {
    detachLeavesOfType,
    ensureSideLeaf,
    workspace: {
      detachLeavesOfType,
      ensureSideLeaf,
    },
  };
}

describe("TrailInspectorHost", () => {
  it("removes only the Trail Inspector carrier for locations without a stable target", async () => {
    const { detachLeavesOfType, ensureSideLeaf, workspace } = createWorkspace();
    const store = createTrailInspectorStore();
    const host = new TrailInspectorHost(workspace, store);

    await host.enterLocation({ kind: "home" }, 1200);

    expect(store.getState().target).toBeNull();
    expect(detachLeavesOfType).toHaveBeenCalledWith(TRAIL_INSPECTOR_VIEW_TYPE);
    expect(ensureSideLeaf).not.toHaveBeenCalled();
  });

  it("creates and reveals the right-sidebar carrier once on a wide target entry", async () => {
    const { detachLeavesOfType, ensureSideLeaf, workspace } = createWorkspace();
    const store = createTrailInspectorStore();
    const host = new TrailInspectorHost(workspace, store);
    const location = { kind: "project", projectId: "project-a" } as const;

    await host.enterLocation(
      location,
      TRAIL_INSPECTOR_AUTO_REVEAL_MAIN_WIDTH,
    );
    await host.enterLocation(location, 1600);

    expect(store.getState().target).toEqual(location);
    expect(ensureSideLeaf).toHaveBeenCalledTimes(1);
    expect(ensureSideLeaf).toHaveBeenCalledWith(
      TRAIL_INSPECTOR_VIEW_TYPE,
      "right",
      { active: true, reveal: true },
    );
    expect(detachLeavesOfType).not.toHaveBeenCalled();
  });

  it("creates the carrier without revealing it when the main pane is narrow", async () => {
    const { ensureSideLeaf, workspace } = createWorkspace();
    const store = createTrailInspectorStore();
    const host = new TrailInspectorHost(workspace, store);

    await host.enterLocation({ kind: "issue", issueId: "issue-a" }, 700);

    expect(ensureSideLeaf).toHaveBeenCalledWith(
      TRAIL_INSPECTOR_VIEW_TYPE,
      "right",
      { active: false, reveal: false },
    );
  });

  it("re-evaluates the same initial entry when its first measurable width was unavailable", async () => {
    const { ensureSideLeaf, workspace } = createWorkspace();
    const store = createTrailInspectorStore();
    const host = new TrailInspectorHost(workspace, store);
    const location = { initiativeId: "initiative-a", kind: "initiative" } as const;

    await host.enterLocation(location, 0);
    await host.enterLocation(
      location,
      TRAIL_INSPECTOR_AUTO_REVEAL_MAIN_WIDTH + 1,
    );

    expect(ensureSideLeaf).toHaveBeenNthCalledWith(
      1,
      TRAIL_INSPECTOR_VIEW_TYPE,
      "right",
      { active: false, reveal: false },
    );
    expect(ensureSideLeaf).toHaveBeenNthCalledWith(
      2,
      TRAIL_INSPECTOR_VIEW_TYPE,
      "right",
      { active: true, reveal: true },
    );
  });

  it("serializes rapid target and no-target transitions so the newest location wins", async () => {
    const { detachLeavesOfType, ensureSideLeaf, workspace } = createWorkspace();
    const store = createTrailInspectorStore();
    const host = new TrailInspectorHost(workspace, store);

    const projectEntry = host.enterLocation(
      { kind: "project", projectId: "project-a" },
      1200,
    );
    const homeEntry = host.enterLocation({ kind: "home" }, 1200);

    await Promise.all([projectEntry, homeEntry]);

    expect(ensureSideLeaf).toHaveBeenCalledTimes(1);
    expect(detachLeavesOfType).toHaveBeenLastCalledWith(TRAIL_INSPECTOR_VIEW_TYPE);
    expect(store.getState().target).toBeNull();
  });
});
