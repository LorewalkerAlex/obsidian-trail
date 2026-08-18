import {
  normalizePath,
  Notice,
  parseYaml,
  Plugin,
  TFile,
  TFolder,
  type TAbstractFile,
  type WorkspaceLeaf,
} from "obsidian";

import { createTrailApplicationSession } from "./application/trail-application-session";
import {
  createObsidianDiagnosticStorage,
  type TrailDiagnosticStorage,
} from "./adapters/obsidian/trail-diagnostics-storage-obsidian";
import { TrailLabelSettingsTab } from "./adapters/obsidian/trail-label-settings-tab";
import { createObsidianPluginDataIO } from "./adapters/obsidian/trail-plugin-data-io-obsidian";
import type { TrailObsidianFileKinds } from "./adapters/obsidian/trail-obsidian-file-kinds";
import { createObsidianSourceIO } from "./adapters/obsidian/trail-source-io-obsidian";
import {
  createObsidianVaultEventAdapter,
  createTrailHostWriteGuard,
} from "./adapters/obsidian/trail-vault-events-obsidian";
import {
  captureObsidianTrailManagedEntries,
} from "./adapters/obsidian/trail-validation-evidence-obsidian";
import {
  TRAIL_VIEW_TYPE,
  TrailView,
} from "./adapters/obsidian/trail-view";
import { createObsidianWorkspaceLayoutIO } from "./adapters/obsidian/trail-workspace-layout-io-obsidian";
import {
  createDiagnosticTrailPluginDataIO,
  createDiagnosticTrailSourceIO,
  createDiagnosticTrailSourceSync,
  createDiagnosticTrailUiActions,
  observeTrailRuntimeDiagnostics,
} from "./diagnostics/trail-diagnostic-observers";
import {
  createTrailDiagnostics,
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "./diagnostics/trail-diagnostics";
import {
  createTrailValidationEvidenceExporter,
} from "./diagnostics/trail-validation-evidence";
import { TrailMutationQueue } from "./mutation/queue/trail-mutation-queue";
import { createTrailDomainSourceRepository } from "./persistence/domain-sources/trail-domain-source-repository";
import { createTrailPluginDataRepository } from "./persistence/plugin-data/trail-plugin-data-repository";
import { createTrailRuntimeStore } from "./runtime/store/trail-runtime-store";
import { TrailRefreshController } from "./source-sync/refresh/trail-refresh-controller";
import { createTrailAuthoritativeSourceSync } from "./source-sync/trail-authoritative-source-sync";

declare const __TRAIL_DIAGNOSTICS_ENABLED__: boolean;

function resolveHostTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone.trim() === "" ? "UTC" : timezone;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const fileKinds: TrailObsidianFileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile => file instanceof TFile,
  isFolder: (file: TAbstractFile | null): file is TFolder => file instanceof TFolder,
};

/** Composition root: lifecycle, dependency graph, view/command/event registration only. */
export default class TrailPlugin extends Plugin {
  private diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS;
  private disposeRuntimeDiagnostics: (() => void) | null = null;
  private mutationQueue: TrailMutationQueue | null = null;
  private refreshController: TrailRefreshController | null = null;

  public onload(): void {
    let diagnosticStorage: TrailDiagnosticStorage | null = null;
    let diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS;
    if (__TRAIL_DIAGNOSTICS_ENABLED__) {
      const diagnosticsDirectory = normalizePath(
        `${this.app.vault.configDir}/plugins/${this.manifest.id}/diagnostics`,
      );
      diagnosticStorage = createObsidianDiagnosticStorage(
        this.app.vault.adapter,
        diagnosticsDirectory,
      );
      diagnostics = createTrailDiagnostics({
        createId: () => crypto.randomUUID(),
        now: () => Date.now(),
        persistence: diagnosticStorage,
      });
    }
    this.diagnostics = diagnostics;
    diagnostics.record("plugin.loaded", {
      data: {
        diagnosticsEnabled: diagnostics.enabled,
        pluginVersion: this.manifest.version,
      },
    });

    const runtimeStore = createTrailRuntimeStore();
    const mutationQueue = new TrailMutationQueue();
    const writeGuard = createTrailHostWriteGuard();
    const rawSourceIO = createObsidianSourceIO(this.app, fileKinds, writeGuard);
    const sourceIO = __TRAIL_DIAGNOSTICS_ENABLED__
      ? createDiagnosticTrailSourceIO(rawSourceIO, diagnostics)
      : rawSourceIO;
    const domainSources = createTrailDomainSourceRepository(
      sourceIO,
      (yaml) => parseYaml(yaml),
    );
    const rawPluginDataIO = createObsidianPluginDataIO({
      loadData: () => this.loadData(),
      saveData: (data) => this.saveData(data),
    });
    const pluginDataIO = __TRAIL_DIAGNOSTICS_ENABLED__
      ? createDiagnosticTrailPluginDataIO(rawPluginDataIO, diagnostics)
      : rawPluginDataIO;
    const pluginData = createTrailPluginDataRepository(pluginDataIO);
    const layout = createObsidianWorkspaceLayoutIO(this.app, fileKinds);
    const createId = () => crypto.randomUUID();
    const refreshController = new TrailRefreshController({
      createId,
      domainSources,
      layout,
      mutationQueue,
      pluginData,
      resolveHostTimezone,
      runtimeStore,
    });
    const authoritativeSourceSync = createTrailAuthoritativeSourceSync({
      domainSources,
      mutationQueue,
      pluginData,
      refresh: refreshController,
      runtimeStore,
    });
    const sourceSync = __TRAIL_DIAGNOSTICS_ENABLED__
      ? createDiagnosticTrailSourceSync(authoritativeSourceSync, diagnostics)
      : authoritativeSourceSync;
    const applicationSession = createTrailApplicationSession({
      environment: { createId, now: () => Date.now() },
      runtimeStore,
      sourceSync,
    });
    const actions = __TRAIL_DIAGNOSTICS_ENABLED__
      ? createDiagnosticTrailUiActions(applicationSession, diagnostics)
      : applicationSession;
    this.addSettingTab(new TrailLabelSettingsTab(
      this.app,
      this,
      runtimeStore,
      applicationSession.configuration,
    ));
    const vaultEvents = createObsidianVaultEventAdapter({
      onObserved: (event, disposition) => {
        diagnostics.record("host.vault.managed-event", {
          data: {
            disposition,
            kind: event.kind,
            oldPath: event.oldPath ?? null,
            path: event.path,
          },
        });
      },
      onRefreshError: (error, event) => {
        diagnostics.record("host.vault.refresh-failed", {
          data: {
            errorMessage: errorMessage(error),
            errorName: errorName(error),
            kind: event.kind,
            path: event.path,
          },
          level: "error",
        });
        console.error(`Trail refresh failed after ${event.kind}: ${event.path}`, error);
      },
      refresh: refreshController,
      writeGuard,
    });
    this.disposeRuntimeDiagnostics = __TRAIL_DIAGNOSTICS_ENABLED__
      ? observeTrailRuntimeDiagnostics(runtimeStore, diagnostics)
      : null;
    this.mutationQueue = mutationQueue;
    this.refreshController = refreshController;

    this.registerView(
      TRAIL_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new TrailView(leaf, runtimeStore, actions),
    );

    this.addRibbonIcon("route", "Open Trail", () => {
      void this.activateView();
    });
    this.addCommand({
      id: "open",
      name: "Open",
      callback: () => {
        void this.activateView();
      },
    });
    if (__TRAIL_DIAGNOSTICS_ENABLED__ && diagnosticStorage !== null) {
      const evidenceExporter = createTrailValidationEvidenceExporter({
        captureManagedEntries: () => captureObsidianTrailManagedEntries(this.app, fileKinds),
        copyText: (text) => navigator.clipboard.writeText(text),
        diagnostics,
        evidencePath: diagnosticStorage.evidencePath,
        loadPluginData: () => this.loadData(),
        now: () => Date.now(),
        pluginId: this.manifest.id,
        pluginVersion: this.manifest.version,
        runtimeStore,
        writeEvidence: (text) => diagnosticStorage.writeValidationEvidence(text),
      });
      this.addCommand({
        id: "copy-validation-evidence",
        name: "Copy validation evidence",
        callback: () => {
          void evidenceExporter.export().then(
            (result) => {
              if (result.copiedToClipboard && result.savedToFile) {
                new Notice(`Trail validation evidence copied and saved to ${result.evidencePath}`);
              } else if (result.copiedToClipboard) {
                new Notice("Trail validation evidence copied; local evidence file could not be written.");
              } else {
                new Notice(`Trail validation evidence saved to ${result.evidencePath}; clipboard unavailable.`);
              }
            },
            (error: unknown) => {
              diagnostics.record("validation.evidence.failed", {
                data: {
                  errorMessage: errorMessage(error),
                  errorName: errorName(error),
                },
                level: "error",
              });
              console.error("Trail validation evidence export failed", error);
              new Notice("Trail validation evidence could not be exported.");
            },
          );
        },
      });
    }

    this.app.workspace.onLayoutReady(() => {
      diagnostics.record("host.layout.ready");
      diagnostics.record("plugin.initialization.requested");
      void refreshController.initialize().then(
        ({ bootstrapped }) => {
          diagnostics.record("plugin.initialization.completed", {
            data: { bootstrapped },
          });
        },
        (error: unknown) => {
          diagnostics.record("plugin.initialization.failed", {
            data: {
              errorMessage: errorMessage(error),
              errorName: errorName(error),
            },
            level: "error",
          });
          console.error("Trail initialization failed", error);
          new Notice("Trail could not initialize. Open Trail for details.");
        },
      ).finally(() => {
        if (this.refreshController !== refreshController) return;
        // Register after the initial bootstrap/load attempt so bootstrap filesystem
        // events are not misclassified as external, while startup failures can
        // still recover when the user fixes managed Markdown afterward.
        this.registerEvent(this.app.vault.on("create", vaultEvents.create));
        this.registerEvent(this.app.vault.on("modify", vaultEvents.modify));
        this.registerEvent(this.app.vault.on("delete", vaultEvents.delete));
        this.registerEvent(this.app.vault.on("rename", vaultEvents.rename));
        diagnostics.record("host.managed-events.registered");
      });
    });
  }

  public onunload(): void {
    this.diagnostics.record("plugin.unloading");
    this.disposeRuntimeDiagnostics?.();
    this.disposeRuntimeDiagnostics = null;
    this.mutationQueue?.dispose();
    this.mutationQueue = null;
    this.refreshController = null;
    void this.diagnostics.dispose();
    this.diagnostics = NOOP_TRAIL_DIAGNOSTICS;
  }

  private async activateView(): Promise<void> {
    const correlationId = this.diagnostics.createCorrelationId("view.activate");
    this.diagnostics.record("view.activate.requested", { correlationId });
    try {
      const { workspace } = this.app;
      let leaf = workspace.getLeavesOfType(TRAIL_VIEW_TYPE)[0];
      const reusedExistingLeaf = leaf !== undefined;
      if (leaf === undefined) {
        leaf = workspace.getLeaf("tab");
        await leaf.setViewState({ active: true, type: TRAIL_VIEW_TYPE });
      }
      await workspace.revealLeaf(leaf);
      this.diagnostics.record("view.activate.completed", {
        correlationId,
        data: { reusedExistingLeaf },
      });
    } catch (error: unknown) {
      this.diagnostics.record("view.activate.failed", {
        correlationId,
        data: {
          errorMessage: errorMessage(error),
          errorName: errorName(error),
        },
        level: "error",
      });
      throw error;
    }
  }
}
