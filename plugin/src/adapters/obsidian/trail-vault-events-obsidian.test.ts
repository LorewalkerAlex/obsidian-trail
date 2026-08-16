import type { TAbstractFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import {
  createObsidianVaultEventAdapter,
  createTrailHostWriteGuard,
} from "./trail-vault-events-obsidian";

function file(path: string): TAbstractFile {
  return { path } as TAbstractFile;
}

describe("Obsidian managed Vault event adapter", () => {
  it("routes every managed event kind through one full-refresh ingress", () => {
    const requestExternalRefresh = vi.fn(async () => undefined);
    const adapter = createObsidianVaultEventAdapter({
      refresh: { requestExternalRefresh },
      writeGuard: createTrailHostWriteGuard(),
    });

    adapter.create(file("Trail/Projects/0001 Project.md"));
    adapter.modify(file("Trail/Collections/Triage.md"));
    adapter.delete(file("Trail/Collections/Cycles.md"));
    adapter.rename(file("Trail/Projects/0002 Renamed.md"), "Trail/Projects/0002 Old.md");

    expect(requestExternalRefresh).toHaveBeenCalledTimes(4);
    expect(requestExternalRefresh).toHaveBeenNthCalledWith(3, {
      kind: "delete",
      path: "Trail/Collections/Cycles.md",
    });
  });

  it("ignores unrelated Vault events but catches renames across the managed boundary", () => {
    const requestExternalRefresh = vi.fn(async () => undefined);
    const adapter = createObsidianVaultEventAdapter({
      refresh: { requestExternalRefresh },
      writeGuard: createTrailHostWriteGuard(),
    });

    adapter.modify(file("Notes/Outside.md"));
    adapter.rename(file("Trail/Projects/0001 Imported.md"), "Outside/Imported.md");
    adapter.rename(file("Outside/Exported.md"), "Trail/Projects/0002 Exported.md");

    expect(requestExternalRefresh).toHaveBeenCalledTimes(2);
  });

  it("suppresses an exact Trail-owned event only while its write guard is active", () => {
    const requestExternalRefresh = vi.fn(async () => undefined);
    const writeGuard = createTrailHostWriteGuard();
    const adapter = createObsidianVaultEventAdapter({
      refresh: { requestExternalRefresh },
      writeGuard,
    });
    const event = {
      kind: "modify" as const,
      path: "Trail/Collections/Triage.md",
    };
    const token = writeGuard.begin(event);

    adapter.modify(file(event.path));
    expect(requestExternalRefresh).not.toHaveBeenCalled();

    writeGuard.end(token);
    adapter.modify(file(event.path));
    expect(requestExternalRefresh).toHaveBeenCalledOnce();
  });

  it("does not suppress a different path or event kind", () => {
    const requestExternalRefresh = vi.fn(async () => undefined);
    const writeGuard = createTrailHostWriteGuard();
    const adapter = createObsidianVaultEventAdapter({
      refresh: { requestExternalRefresh },
      writeGuard,
    });
    const token = writeGuard.begin({
      kind: "modify",
      path: "Trail/Collections/Triage.md",
    });

    adapter.delete(file("Trail/Collections/Triage.md"));
    adapter.modify(file("Trail/Collections/Cycles.md"));

    writeGuard.end(token);
    expect(requestExternalRefresh).toHaveBeenCalledTimes(2);
  });
});