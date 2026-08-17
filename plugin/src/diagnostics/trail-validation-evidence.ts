import type { TrailRuntimeState, TrailRuntimeStore } from "../runtime/store/trail-runtime-store";
import type { TrailDiagnostics } from "./trail-diagnostics";

export interface TrailManagedEvidenceEntry {
  readonly content?: string;
  readonly kind: "directory" | "file";
  readonly path: string;
  readonly readError?: string;
}

export interface TrailValidationEvidence {
  readonly diagnostics: readonly unknown[];
  readonly generatedAt: number;
  readonly managedEntries: readonly TrailManagedEvidenceEntry[];
  readonly plugin: {
    readonly id: string;
    readonly version: string;
  };
  readonly pluginData: unknown;
  readonly runtime: ReturnType<typeof snapshotTrailRuntimeState>;
  readonly version: 1;
}

export interface TrailValidationEvidenceExportResult {
  readonly copiedToClipboard: boolean;
  readonly evidencePath: string;
  readonly length: number;
  readonly savedToFile: boolean;
}

function sortedRecord<T>(map: ReadonlyMap<string, T>): Readonly<Record<string, T>> {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

export function snapshotTrailRuntimeState(state: TrailRuntimeState) {
  return {
    committed: {
      authoritative: {
        configuration: state.committed.authoritative.configuration,
        domain: {
          cyclesById: sortedRecord(state.committed.authoritative.domain.cyclesById),
          initiativesById: sortedRecord(state.committed.authoritative.domain.initiativesById),
          issuesById: sortedRecord(state.committed.authoritative.domain.issuesById),
          milestonesById: sortedRecord(state.committed.authoritative.domain.milestonesById),
          projectsById: sortedRecord(state.committed.authoritative.domain.projectsById),
        },
        workspaceState: state.committed.authoritative.workspaceState,
      },
      indexes: {
        issuesByProjectId: sortedRecord(state.committed.indexes.issuesByProjectId),
      },
      ownership: {
        sourceByEntityId: sortedRecord(state.committed.ownership.sourceByEntityId),
        sourceEntityIdsByPath: sortedRecord(state.committed.ownership.sourceEntityIdsByPath),
      },
      revision: state.committed.revision,
    },
    control: state.control,
    health: state.health,
    pending: state.pending,
  };
}

function parseDiagnosticTrace(trace: string): readonly unknown[] {
  return trace
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return { malformedDiagnosticLine: line };
      }
    });
}

/** Creates one self-contained verification document that can be pasted or uploaded as-is. */
export function createTrailValidationEvidence(input: {
  readonly diagnosticTrace: string;
  readonly generatedAt: number;
  readonly managedEntries: readonly TrailManagedEvidenceEntry[];
  readonly pluginId: string;
  readonly pluginVersion: string;
  readonly pluginData: unknown;
  readonly runtimeState: TrailRuntimeState;
}): TrailValidationEvidence {
  return {
    diagnostics: parseDiagnosticTrace(input.diagnosticTrace),
    generatedAt: input.generatedAt,
    managedEntries: [...input.managedEntries].sort((left, right) => left.path.localeCompare(right.path)),
    plugin: { id: input.pluginId, version: input.pluginVersion },
    pluginData: input.pluginData ?? null,
    runtime: snapshotTrailRuntimeState(input.runtimeState),
    version: 1,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Coordinates the evidence export while host-specific capture/copy/write stay behind injected callbacks. */
export function createTrailValidationEvidenceExporter(input: {
  readonly captureManagedEntries: () => Promise<readonly TrailManagedEvidenceEntry[]>;
  readonly copyText: (text: string) => Promise<void>;
  readonly diagnostics: TrailDiagnostics;
  readonly evidencePath: string;
  readonly loadPluginData: () => Promise<unknown>;
  readonly now: () => number;
  readonly pluginId: string;
  readonly pluginVersion: string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writeEvidence: (text: string) => Promise<void>;
}) {
  return {
    async export(): Promise<TrailValidationEvidenceExportResult> {
      const correlationId = input.diagnostics.createCorrelationId("validation.evidence");
      input.diagnostics.record("validation.evidence.requested", { correlationId });

      const [diagnosticTrace, managedEntries, pluginData] = await Promise.all([
        input.diagnostics.exportRecent(2),
        input.captureManagedEntries(),
        input.loadPluginData().catch((error: unknown) => ({
          readError: errorMessage(error),
        })),
      ]);
      const evidence = createTrailValidationEvidence({
        diagnosticTrace,
        generatedAt: input.now(),
        managedEntries,
        pluginData,
        pluginId: input.pluginId,
        pluginVersion: input.pluginVersion,
        runtimeState: input.runtimeStore.getState(),
      });
      const text = `${JSON.stringify(evidence, null, 2)}\n`;

      let savedToFile = true;
      let fileError: unknown;
      try {
        await input.writeEvidence(text);
      } catch (error: unknown) {
        savedToFile = false;
        fileError = error;
        input.diagnostics.record("validation.evidence.file-failed", {
          correlationId,
          data: { errorMessage: errorMessage(error) },
          level: "warn",
        });
      }

      let copiedToClipboard = true;
      let clipboardError: unknown;
      try {
        await input.copyText(text);
      } catch (error: unknown) {
        copiedToClipboard = false;
        clipboardError = error;
        input.diagnostics.record("validation.evidence.clipboard-failed", {
          correlationId,
          data: { errorMessage: errorMessage(error) },
          level: "warn",
        });
      }

      if (!savedToFile && !copiedToClipboard) {
        throw new Error(
          `Validation evidence could not be saved or copied: ${errorMessage(fileError)}; ${errorMessage(clipboardError)}`,
        );
      }

      input.diagnostics.record("validation.evidence.exported", {
        correlationId,
        data: {
          copiedToClipboard,
          evidencePath: input.evidencePath,
          length: text.length,
          managedEntryCount: managedEntries.length,
          savedToFile,
        },
      });
      return {
        copiedToClipboard,
        evidencePath: input.evidencePath,
        length: text.length,
        savedToFile,
      };
    },
  };
}
