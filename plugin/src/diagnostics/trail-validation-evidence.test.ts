import { describe, expect, it, vi } from "vitest";

import { createTrailRuntimeStore, setTrailRuntimeControl } from "../runtime/store/trail-runtime-store";
import { NOOP_TRAIL_DIAGNOSTICS } from "./trail-diagnostics";
import {
  createTrailValidationEvidence,
  createTrailValidationEvidenceExporter,
} from "./trail-validation-evidence";

describe("Trail validation evidence", () => {
  it("serializes Runtime maps, diagnostics, plugin data, and raw managed sources", () => {
    const runtimeStore = createTrailRuntimeStore();
    setTrailRuntimeControl(runtimeStore, { kind: "ready" });

    const evidence = createTrailValidationEvidence({
      diagnosticTrace: `${JSON.stringify({ name: "runtime.control.changed", sequence: 1 })}\n`,
      generatedAt: 123,
      managedEntries: [
        { content: "# B", kind: "file", path: "Trail/Projects/B.md" },
        { kind: "directory", path: "Trail/Projects" },
      ],
      pluginData: { configuration: { example: true } },
      pluginId: "trail",
      pluginVersion: "0.0.1",
      runtimeState: runtimeStore.getState(),
    });

    expect(evidence.diagnostics).toEqual([
      { name: "runtime.control.changed", sequence: 1 },
    ]);
    expect(evidence.runtime.control.kind).toBe("ready");
    expect(evidence.managedEntries.map(({ path }) => path)).toEqual([
      "Trail/Projects",
      "Trail/Projects/B.md",
    ]);
    expect(JSON.stringify(evidence)).toContain("configuration");
  });

  it("persists one evidence document and copies the exact same text", async () => {
    const written: string[] = [];
    const copyText = vi.fn(async (_text: string) => undefined);
    const exporter = createTrailValidationEvidenceExporter({
      captureManagedEntries: async () => [
        { content: "# QA", kind: "file", path: "Trail/Projects/0001 QA.md" },
      ],
      copyText,
      diagnostics: NOOP_TRAIL_DIAGNOSTICS,
      evidencePath: ".obsidian/plugins/trail/diagnostics/validation-evidence.json",
      loadPluginData: async () => ({ configuration: {} }),
      now: () => 123,
      pluginId: "trail",
      pluginVersion: "0.0.1",
      runtimeStore: createTrailRuntimeStore(),
      writeEvidence: async (text) => { written.push(text); },
    });

    const result = await exporter.export();

    expect(result.copiedToClipboard).toBe(true);
    expect(result.savedToFile).toBe(true);
    expect(written).toHaveLength(1);
    expect(written[0]).toContain('"Trail/Projects/0001 QA.md"');
    expect(copyText).toHaveBeenCalledWith(written[0]);
  });

  it("still copies evidence when file persistence is unavailable", async () => {
    const copied: string[] = [];
    const exporter = createTrailValidationEvidenceExporter({
      captureManagedEntries: async () => [],
      copyText: async (text) => { copied.push(text); },
      diagnostics: NOOP_TRAIL_DIAGNOSTICS,
      evidencePath: ".obsidian/plugins/trail/diagnostics/validation-evidence.json",
      loadPluginData: async () => null,
      now: () => 123,
      pluginId: "trail",
      pluginVersion: "0.0.1",
      runtimeStore: createTrailRuntimeStore(),
      writeEvidence: () => Promise.reject(new Error("disk unavailable")),
    });

    const result = await exporter.export();

    expect(result.savedToFile).toBe(false);
    expect(result.copiedToClipboard).toBe(true);
    expect(copied).toHaveLength(1);
  });
});
