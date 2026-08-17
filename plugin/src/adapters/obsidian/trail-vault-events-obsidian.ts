import type { TAbstractFile } from "obsidian";

import { isTrailManagedPath } from "../../markdown/schema/trail-paths";
import type { TrailManagedPersistenceEvent } from "../../source-sync/refresh/trail-refresh-controller";

export type TrailVaultEvent = TrailManagedPersistenceEvent;
export type TrailVaultEventDisposition = "external-refresh" | "trail-write-suppressed";

export interface TrailExternalRefreshPort {
  readonly requestExternalRefresh: (event: TrailVaultEvent) => Promise<void>;
}

export interface TrailHostWriteGuard {
  readonly begin: (event: TrailVaultEvent) => number;
  readonly consume: (event: TrailVaultEvent) => boolean;
  readonly end: (token: number) => void;
}

interface GuardedEvent {
  readonly event: TrailVaultEvent;
  readonly token: number;
}

function sameVaultEvent(left: TrailVaultEvent, right: TrailVaultEvent): boolean {
  if (left.kind !== right.kind || left.path !== right.path) return false;
  return left.kind !== "rename"
    || (right.kind === "rename" && left.oldPath === right.oldPath);
}

/** Suppresses only the exact host event expected while one Trail-owned write is active. */
export function createTrailHostWriteGuard(): TrailHostWriteGuard {
  const active = new Map<number, GuardedEvent>();
  let nextToken = 0;

  return {
    begin(event): number {
      const token = ++nextToken;
      active.set(token, { event, token });
      return token;
    },
    consume(event): boolean {
      for (const [token, guarded] of active) {
        if (!sameVaultEvent(guarded.event, event)) continue;
        active.delete(token);
        return true;
      }
      return false;
    },
    end(token): void {
      active.delete(token);
    },
  };
}

export interface TrailObsidianVaultEventAdapter {
  readonly create: (file: TAbstractFile) => void;
  readonly delete: (file: TAbstractFile) => void;
  readonly modify: (file: TAbstractFile) => void;
  readonly rename: (file: TAbstractFile, oldPath: string) => void;
}

function isManagedEvent(event: TrailVaultEvent): boolean {
  return isTrailManagedPath(event.path)
    || (event.kind === "rename"
      && event.oldPath !== undefined
      && isTrailManagedPath(event.oldPath));
}

/** Converts Obsidian callbacks into the single Source Sync external-refresh ingress. */
export function createObsidianVaultEventAdapter(input: {
  readonly refresh: TrailExternalRefreshPort;
  readonly writeGuard: TrailHostWriteGuard;
  readonly onObserved?: (
    event: TrailVaultEvent,
    disposition: TrailVaultEventDisposition,
  ) => void;
  readonly onRefreshError?: (error: unknown, event: TrailVaultEvent) => void;
}): TrailObsidianVaultEventAdapter {
  const route = (event: TrailVaultEvent): void => {
    if (!isManagedEvent(event)) return;
    if (input.writeGuard.consume(event)) {
      input.onObserved?.(event, "trail-write-suppressed");
      return;
    }
    input.onObserved?.(event, "external-refresh");
    void input.refresh.requestExternalRefresh(event).catch((error: unknown) => {
      input.onRefreshError?.(error, event);
    });
  };

  return {
    create: (file) => route({ kind: "create", path: file.path }),
    delete: (file) => route({ kind: "delete", path: file.path }),
    modify: (file) => route({ kind: "modify", path: file.path }),
    rename: (file, oldPath) => route({ kind: "rename", oldPath, path: file.path }),
  };
}
