import type { TAbstractFile } from "obsidian";

import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import { isTrailManagedPath } from "../../markdown/schema/trail-paths";
import type {
  TrailManagedPersistenceEvent,
} from "../../source-sync/refresh/trail-refresh-controller";

export type TrailVaultEvent = TrailManagedPersistenceEvent;

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
  if (left.kind !== right.kind || left.path !== right.path) {
    return false;
  }
  return left.kind !== "rename"
    || (right.kind === "rename" && left.oldPath === right.oldPath);
}

/**
 * Tracks only host events expected while a Trail-owned write Promise is active.
 * No TTL is used: a late event is deliberately treated as external and refreshed.
 */
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
        if (!sameVaultEvent(guarded.event, event)) {
          continue;
        }
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

export interface ObsidianVaultEventAdapter {
  readonly create: (file: TAbstractFile) => void;
  readonly delete: (file: TAbstractFile) => void;
  readonly modify: (file: TAbstractFile) => void;
  readonly rename: (file: TAbstractFile, oldPath: string) => void;
}

function isManagedEvent(event: TrailVaultEvent): boolean {
  return isTrailManagedPath(event.path)
    || (event.kind === "rename" && isTrailManagedPath(event.oldPath));
}

/**
 * Converts Obsidian Vault callbacks into one managed-persistence refresh ingress.
 * Path classification stays in the canonical path authority; source-specific
 * refresh policy stays below this host adapter.
 */
export function createObsidianVaultEventAdapter(options: {
  readonly diagnostics?: TrailDiagnostics;
  readonly refresh: TrailExternalRefreshPort;
  readonly writeGuard: TrailHostWriteGuard;
}): ObsidianVaultEventAdapter {
  const diagnostics = options.diagnostics ?? NOOP_TRAIL_DIAGNOSTICS;

  const route = (event: TrailVaultEvent): void => {
    if (!isManagedEvent(event)) {
      return;
    }

    if (options.writeGuard.consume(event)) {
      diagnostics.record("host.vault.trail-write-event-suppressed", {
        data: {
          kind: event.kind,
          oldPath: event.kind === "rename" ? event.oldPath : null,
          path: event.path,
        },
      });
      return;
    }

    const correlationId = diagnostics.createCorrelationId(
      `vault.${event.kind}`,
    );
    diagnostics.record("host.vault.external-change", {
      correlationId,
      data: {
        kind: event.kind,
        oldPath: event.kind === "rename" ? event.oldPath : null,
        path: event.path,
      },
    });

    void options.refresh.requestExternalRefresh(event).catch((error: unknown) => {
      diagnostics.record("host.vault.external-refresh-failed", {
        correlationId,
        data: {
          errorName: error instanceof Error ? error.name : "UnknownError",
          kind: event.kind,
          path: event.path,
        },
        level: "error",
      });
      console.error("Trail managed-source refresh failed", error);
    });
  };

  return {
    create: (file) => route({ kind: "create", path: file.path }),
    delete: (file) => route({ kind: "delete", path: file.path }),
    modify: (file) => route({ kind: "modify", path: file.path }),
    rename: (file, oldPath) => route({
      kind: "rename",
      oldPath,
      path: file.path,
    }),
  };
}