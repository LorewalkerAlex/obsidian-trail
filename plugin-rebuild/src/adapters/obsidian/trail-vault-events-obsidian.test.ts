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
  it("routes managed events and boundary-crossing renames through one refresh ingress", () => {
    const requestExternalRefresh = vi.fn(async () => undefined);
    const adapter = createObsidianVaultEventAdapter({
      refresh: { requestExternalRefresh },
      writeGuard: createTrailHostWriteGuard(),
    });

    adapter.create(file("Trail/Projects/0001 Project.md"));
    adapter.modify(file("Notes/Outside.md"));
    adapter.rename(file("Trail/Projects/0002 Imported.md"), "Outside/Imported.md");
    adapter.rename(file("Outside/Exported.md"), "Trail/Projects/0003 Exported.md");

    expect(requestExternalRefresh).toHaveBeenCalledTimes(3);
  });

  it("suppresses the exact Trail-owned event and exposes its disposition", () => {
    const requestExternalRefresh = vi.fn(async () => undefined);
    const onObserved = vi.fn();
    const writeGuard = createTrailHostWriteGuard();
    const adapter = createObsidianVaultEventAdapter({
      onObserved,
      refresh: { requestExternalRefresh },
      writeGuard,
    });
    const event = { kind: "modify" as const, path: "Trail/Collections/Triage.md" };
    const token = writeGuard.begin(event);

    adapter.modify(file(event.path));
    adapter.delete(file(event.path));
    writeGuard.end(token);

    expect(requestExternalRefresh).toHaveBeenCalledOnce();
    expect(onObserved).toHaveBeenNthCalledWith(1, event, "trail-write-suppressed");
    expect(onObserved).toHaveBeenNthCalledWith(2, {
      kind: "delete",
      path: event.path,
    }, "external-refresh");
  });

  it("reports external managed events before requesting refresh", () => {
    const order: string[] = [];
    const adapter = createObsidianVaultEventAdapter({
      onObserved: (_event, disposition) => order.push(disposition),
      refresh: {
        requestExternalRefresh: async () => { order.push("refresh"); },
      },
      writeGuard: createTrailHostWriteGuard(),
    });

    adapter.delete(file("Trail/Collections/Cycles.md"));

    expect(order).toEqual(["external-refresh", "refresh"]);
  });

  it("reports async refresh failure through the adapter error boundary", async () => {
    const failure = new Error("refresh failed");
    const onRefreshError = vi.fn();
    const adapter = createObsidianVaultEventAdapter({
      onRefreshError,
      refresh: { requestExternalRefresh: () => Promise.reject(failure) },
      writeGuard: createTrailHostWriteGuard(),
    });
    const event = { kind: "modify" as const, path: "Trail/Collections/Triage.md" };

    adapter.modify(file(event.path));

    await vi.waitFor(() => {
      expect(onRefreshError).toHaveBeenCalledWith(failure, event);
    });
  });
});
