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

import { TrailApplication } from "./application/trail-application";
import {
  createTrailApplicationSession,
  createTrailApplicationSessionRegistry,
} from "./application/trail-application-session";
import {
  createObsidianVaultEventAdapter,
  createTrailHostWriteGuard,
} from "./adapters/obsidian/trail-vault-events-obsidian";
import { createObsidianSourceIO } from "./adapters/obsidian/trail-source-io-obsidian";
import {
  createObsidianWorkspaceBootstrapGateway,
  type ObsidianWorkspaceFileKinds,
} from "./adapters/obsidian/trail-workspace-bootstrap-obsidian";
import {
  createObsidianDiagnosticPersistence,
} from "./diagnostics/trail-diagnostics-obsidian";
import {
  createTrailDiagnostics,
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "./diagnostics/trail-diagnostics";
import type { TrailConfiguration } from "./domain/trail-configuration";
import { createFormalMarkdownValidator } from "./markdown/codecs/trail-managed-codecs";
import { TrailMutationQueue } from "./mutation/queue/trail-mutation-queue";
import { createTrailDomainSourceRepository } from "./persistence/domain-sources/trail-domain-source-repository";
import { createProjectSourcePersistence } from "./persistence/domain-sources/trail-project-source-persistence";
import { createTriageSourcePersistence } from "./persistence/domain-sources/trail-triage-source-persistence";
import { createTrailRuntimeStore } from "./runtime/store/trail-runtime-store";
import { TrailProjectSourceSync } from "./source-sync/projects/trail-project-source-sync";
import {
  createTrailRefreshController,
  type TrailRefreshController,
} from "./source-sync/refresh/trail-refresh-controller";
import { TrailTriageSourceSync } from "./source-sync/triage/trail-triage-source-sync";
import {
  TRAIL_VIEW_TYPE,
  TrailView,
} from "./trail-view";

function resolveHostTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone.trim() === "" ? "UTC" : timezone;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

interface TrailActiveSourceSyncs {
  readonly triage: TrailTriageSourceSync;
  readonly workflow: TrailProjectSourceSync;
}

const fileKinds: ObsidianWorkspaceFileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile => file instanceof TFile,
  isFolder: (file: TAbstractFile | null): file is TFolder => file instanceof TFolder,
};

export default class TrailPlugin extends Plugin {
  private application: TrailApplication | null = null;
  private diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS;
  private disposeComposition: (() => void) | null = null;
  private refreshController: TrailRefreshController | null = null;

  public onload(): void {
    const diagnostics = this.createDiagnostics();
    this.diagnostics = diagnostics;
    diagnostics.record("plugin.loaded", {
      data: {
        diagnosticsEnabled: diagnostics.enabled,
        pluginVersion: this.manifest.version,
      },
    });

    const runtimeStore = createTrailRuntimeStore();
    const mutationQueue = new TrailMutationQueue(diagnostics);
    const parseYamlDocument = (yaml: string): unknown => parseYaml(yaml);
    const writeGuard = createTrailHostWriteGuard();
    const sourceIO = createObsidianSourceIO(this.app, fileKinds, writeGuard);
    const domainSourceRepository = createTrailDomainSourceRepository(sourceIO);
    const workspaceGateway = createObsidianWorkspaceBootstrapGateway(
      this.app,
      {
        loadData: () => this.loadData(),
        saveData: (data) => this.saveData(data),
      },
      createFormalMarkdownValidator(parseYamlDocument),
      fileKinds,
    );
    const triagePersistence = createTriageSourcePersistence(
      domainSourceRepository,
      parseYamlDocument,
      diagnostics,
    );
    const workflowPersistence = createProjectSourcePersistence(
      domainSourceRepository,
      parseYamlDocument,
      diagnostics,
    );
    const sessionRegistry = createTrailApplicationSessionRegistry();
    const createId = () => crypto.randomUUID();
    const now = () => Date.now();
    const application = new TrailApplication({
      diagnostics,
      runtimeStore,
      session: sessionRegistry,
    });
    const createSourceSyncs = (
      store: typeof runtimeStore,
      configuration: TrailConfiguration,
    ): TrailActiveSourceSyncs => ({
      triage: new TrailTriageSourceSync(
        store,
        mutationQueue,
        triagePersistence,
        diagnostics,
      ),
      workflow: new TrailProjectSourceSync(
        store,
        mutationQueue,
        workflowPersistence,
        configuration,
        diagnostics,
      ),
    });
    const refreshController = createTrailRefreshController<TrailActiveSourceSyncs>({
      activateSources: (configuration, sources) => {
        sessionRegistry.replace(createTrailApplicationSession({
          configuration,
          createId,
          diagnostics,
          mutationQueue,
          now,
          runtimeStore,
          triageSources: sources.triage,
          workflowSources: sources.workflow,
        }));
      },
      clearSources: () => sessionRegistry.clear(),
      createId,
      createSourceSyncs,
      diagnostics,
      mutationQueue,
      resolveHostTimezone,
      runtimeStore,
      workspace: workspaceGateway,
    });
    const vaultEvents = createObsidianVaultEventAdapter({
      diagnostics,
      refresh: refreshController,
      writeGuard,
    });

    this.application = application;
    this.refreshController = refreshController;
    this.disposeComposition = () => {
      refreshController.dispose();
      sessionRegistry.clear();
      mutationQueue.dispose();
    };

    this.registerView(
      TRAIL_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new TrailView(
        leaf,
        runtimeStore,
        application,
        diagnostics,
      ),
    );

    this.app.workspace.onLayoutReady(() => {
      diagnostics.record("host.layout.ready");
      if (
        this.application !== application
        || this.refreshController !== refreshController
      ) {
        return;
      }
      void this.initializeAfterLayout(refreshController, vaultEvents);
    });

    this.addRibbonIcon("route", "Open trail", () => {
      void this.activateView("ribbon");
    });

    this.addCommand({
      id: "open",
      name: "Open",
      callback: () => {
        void this.activateView("command");
      },
    });

    if (__TRAIL_DIAGNOSTICS_ENABLED__) {
      this.addCommand({
        id: "copy-diagnostics-trace",
        name: "Copy diagnostics trace",
        callback: () => {
          void this.copyDiagnosticsTrace();
        },
      });
    }
  }

  public onunload(): void {
    this.diagnostics.record("plugin.unloading");
    this.disposeComposition?.();
    this.disposeComposition = null;
    this.refreshController = null;
    this.application = null;
    void this.diagnostics.dispose();
    this.diagnostics = NOOP_TRAIL_DIAGNOSTICS;
  }

  private createDiagnostics(): TrailDiagnostics {
    if (!__TRAIL_DIAGNOSTICS_ENABLED__) {
      return NOOP_TRAIL_DIAGNOSTICS;
    }

    const directoryPath = normalizePath(
      `${this.app.vault.configDir}/plugins/${this.manifest.id}/diagnostics`,
    );
    return createTrailDiagnostics({
      createId: () => crypto.randomUUID(),
      now: () => Date.now(),
      persistence: createObsidianDiagnosticPersistence(
        this.app.vault.adapter,
        directoryPath,
      ),
    });
  }

  private async copyDiagnosticsTrace(): Promise<void> {
    const correlationId = this.diagnostics.createCorrelationId("diagnostics.export");
    this.diagnostics.record("diagnostics.export.requested", {
      correlationId,
      data: { maxSessions: 2 },
    });

    try {
      const trace = await this.diagnostics.exportRecent(2);
      if (trace.trim() === "") {
        new Notice("Trail diagnostics trace is empty.");
        return;
      }

      await navigator.clipboard.writeText(trace);
      new Notice("Trail diagnostics copied (up to 2 recent sessions).");
    } catch (error: unknown) {
      this.diagnostics.record("diagnostics.export.failed", {
        correlationId,
        data: { errorName: errorName(error) },
        level: "error",
      });
      console.error("Trail diagnostics export failed", error);
      new Notice("Trail diagnostics could not be copied.");
    }
  }

  private async initializeAfterLayout(
    refreshController: TrailRefreshController,
    vaultEvents: ReturnType<typeof createObsidianVaultEventAdapter>,
  ): Promise<void> {
    try {
      const classification = await refreshController.initialize();
      if (
        !classification.canLoad
        || this.refreshController !== refreshController
      ) {
        return;
      }

      this.registerEvent(this.app.vault.on("create", vaultEvents.create));
      this.registerEvent(this.app.vault.on("modify", vaultEvents.modify));
      this.registerEvent(this.app.vault.on("delete", vaultEvents.delete));
      this.registerEvent(this.app.vault.on("rename", vaultEvents.rename));
      this.diagnostics.record("host.formal-events.registered");
    } catch (error: unknown) {
      this.diagnostics.record("plugin.initialization.failed", {
        data: { errorName: errorName(error) },
        level: "error",
      });
      console.error("Trail Formal initialization failed", error);
    }
  }

  private async activateView(trigger: "command" | "ribbon"): Promise<void> {
    const correlationId = this.diagnostics.createCorrelationId("view.activate");
    this.diagnostics.record("view.activate.requested", {
      correlationId,
      data: { trigger },
    });

    try {
      const { workspace } = this.app;
      let leaf = workspace.getLeavesOfType(TRAIL_VIEW_TYPE)[0];
      const reusedExistingLeaf = leaf !== undefined;

      if (!leaf) {
        leaf = workspace.getLeaf("tab");
        await leaf.setViewState({
          active: true,
          type: TRAIL_VIEW_TYPE,
        });
      }

      await workspace.revealLeaf(leaf);
      this.diagnostics.record("view.activate.completed", {
        correlationId,
        data: { reusedExistingLeaf },
      });
    } catch (error: unknown) {
      this.diagnostics.record("view.activate.failed", {
        correlationId,
        data: { errorName: errorName(error) },
        level: "error",
      });
      throw error;
    }
  }
}