import { describe, expect, it, vi } from "vitest";

import type { TrailAuthoritativeSourceSync } from "../source-sync/trail-authoritative-source-sync";
import { createTrailMutationPlan } from "../mutation/plans/trail-mutation-plan";
import { createTrailRuntimeStore, setTrailRuntimeControl } from "../runtime/store/trail-runtime-store";
import type { TrailDiagnostics, TrailDiagnosticRecordOptions } from "./trail-diagnostics";
import {
  createDiagnosticTrailSourceSync,
  observeTrailRuntimeDiagnostics,
} from "./trail-diagnostic-observers";

function recorder() {
  const events: Array<{ name: string; options?: TrailDiagnosticRecordOptions }> = [];
  const diagnostics: TrailDiagnostics = {
    enabled: true,
    createCorrelationId: (prefix) => `session:${prefix}:1`,
    dispose: () => Promise.resolve(),
    exportRecent: () => Promise.resolve(""),
    flush: () => Promise.resolve(),
    record: (name, options) => events.push({ name, options }),
  };
  return { diagnostics, events };
}

describe("Trail diagnostic observers", () => {
  it("correlates logical mutation submission and completion by command ID", async () => {
    const { diagnostics, events } = recorder();
    const submit = vi.fn(async () => ({ operations: [], topology: "single" as const }));
    const sourceSync = createDiagnosticTrailSourceSync(
      { submit } as unknown as TrailAuthoritativeSourceSync,
      diagnostics,
    );
    const plan = createTrailMutationPlan({
      commandId: "command-a",
      effects: [{
        after: {
          kind: "project",
          value: {
            id: "project-a",
            labelIds: [],
            statusDefinitionId: "status-a",
            title: "Project A",
          },
        },
        kind: "create-entity",
      }],
      intent: "project.create",
    });

    await sourceSync.submit(plan);

    expect(events.map(({ name }) => name)).toEqual([
      "mutation.submitted",
      "mutation.committed",
    ]);
    expect(events[0]?.options?.correlationId).toBe("command-a");
    expect(events[1]?.options?.correlationId).toBe("command-a");
  });

  it("records Runtime control and pending transitions only when they change", () => {
    const { diagnostics, events } = recorder();
    const store = createTrailRuntimeStore();
    const dispose = observeTrailRuntimeDiagnostics(store, diagnostics);

    setTrailRuntimeControl(store, { kind: "ready" });
    setTrailRuntimeControl(store, { kind: "ready" });
    dispose();

    expect(events.map(({ name }) => name)).toEqual([
      "runtime.observer.started",
      "runtime.control.changed",
    ]);
  });
});
