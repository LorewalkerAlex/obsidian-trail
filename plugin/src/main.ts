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
import { createFormalMarkdownValidator } from "./markdown/codecs/trail-managed-codecs";
import { createTrailDomainSourceRepository } from "./persistence/domain-sources/trail-domain-source-repository";
import { createProjectSourcePersistence } from "./persistence/domain-sources/trail-project-source-persistence";
import { createTriageSourcePersistence } from "./persistence/domain-sources/trail-triage-source-persistence";
import { TrailMutationQueue } from "./mutation/queue/trail-mutation-queue";
import { isTrailProjectMarkdownPath, TRAIL_PROJECTS_PATH, TRAIL_PROJECTS_PREFIX, TRAIL_TRIAGE_PATH } from "./markdown/schema/trail-paths";
import {
  createTrailRuntimeStore,
} from "./runtime/store/trail-runtime-store";
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

const fileKinds: ObsidianWorkspaceFileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile => file instanceof TFile,
  isFolder: (file: TAbstractFile | null): file is TFolder => file instanceof TFolder,
};

export default class TrailPlugin extends Plugin {
  private application: TrailApplication | null = null;
  private diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS;

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
    const sourceIO = createObsidianSourceIO(this.app, fileKinds);
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
    const application = new TrailApplication({
      createId: () => crypto.randomUUID(),
      diagnostics,
      mutationQueue,
      now: () => Date.now(),
      resolveHostTimezone,
      runtimeStore,
      triagePersistence,
      workflowPersistence,
      workspace: workspaceGateway,
    });

    this.application = application;

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
      if (this.application !== application) {
        return;
      }
      void this.initializeAfterLayout(application);
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
    this.application?.dispose();
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
    application: TrailApplication,
  ): Promise<void> {
    try {
      const classification = await application.initialize();
      if (!classification.canLoad || this.application !== application) {
        return;
      }
      this.registerFormalEvents(application);
      this.diagnostics.record("host.formal-events.registered");
    } catch (error: unknown) {
      this.diagnostics.record("plugin.initialization.failed", {
        data: { errorName: errorName(error) },
        level: "error",
      });
      console.error("Trail Formal initialization failed", error);
    }
  }

  private registerFormalEvents(application: TrailApplication): void {
    this.registerEvent(
      this.app.vault.on("modify", (file: TAbstractFile) => {
        if (file.path === TRAIL_TRIAGE_PATH) {
          const correlationId = this.diagnostics.createCorrelationId("vault.modify");
          this.diagnostics.record("host.vault.modify", {
            correlationId,
            data: { path: file.path },
          });
          void application.refreshTriage(correlationId).catch((error: unknown) => {
            this.diagnostics.record("host.vault.modify.reconcile-failed", {
              correlationId,
              data: { errorName: errorName(error) },
              level: "error",
            });
            console.error("Trail Triage reconciliation failed", error);
          });
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("delete", (file: TAbstractFile) => {
        if (file.path === TRAIL_TRIAGE_PATH) {
          const correlationId = this.diagnostics.createCorrelationId("vault.delete");
          this.diagnostics.record("host.vault.delete", {
            correlationId,
            data: { path: file.path },
            level: "warn",
          });
          application.markRequiredTriageUnavailable(
            `Required Formal Triage file was removed: ${TRAIL_TRIAGE_PATH}. Restore it and reload Trail; it will not be silently recreated.`,
            correlationId,
          );
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
        if (oldPath === TRAIL_TRIAGE_PATH || file.path === TRAIL_TRIAGE_PATH) {
          const correlationId = this.diagnostics.createCorrelationId("vault.rename");
          this.diagnostics.record("host.vault.rename", {
            correlationId,
            data: {
              newPath: file.path,
              oldPath,
            },
            level: "warn",
          });
          application.markRequiredTriageUnavailable(
            `Required Formal Triage path changed. Restore ${TRAIL_TRIAGE_PATH} and reload Trail.`,
            correlationId,
          );
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("create", (file: TAbstractFile) => {
        if (isTrailProjectMarkdownPath(file.path)) {
          this.refreshWorkflowSource(application, file.path, "vault.create");
          return;
        }
        if (this.isWithinProjects(file.path)) {
          this.refreshWorkflow(application, "vault.create-structure");
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("modify", (file: TAbstractFile) => {
        if (isTrailProjectMarkdownPath(file.path)) {
          this.refreshWorkflowSource(application, file.path, "vault.modify");
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("delete", (file: TAbstractFile) => {
        if (file.path === TRAIL_PROJECTS_PATH) {
          const correlationId = this.diagnostics.createCorrelationId(
            "vault.delete-projects-root",
          );
          application.markWorkflowRootUnavailable(
            `Required Formal Projects directory was removed: ${TRAIL_PROJECTS_PATH}. Restore it and reload Trail; it will not be silently recreated.`,
            correlationId,
          );
          return;
        }
        if (isTrailProjectMarkdownPath(file.path)) {
          const correlationId = this.diagnostics.createCorrelationId(
            "vault.delete-project",
          );
          this.diagnostics.record("host.vault.delete", {
            correlationId,
            data: { path: file.path },
            level: "warn",
          });
          void application.removeWorkflowSource(file.path, correlationId).catch(
            (error: unknown) => this.recordWorkflowReconcileFailure(
              correlationId,
              error,
              "delete",
            ),
          );
          return;
        }
        if (this.isWithinProjects(file.path)) {
          this.refreshWorkflow(application, "vault.delete-structure");
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
        if (oldPath === TRAIL_PROJECTS_PATH && file.path !== TRAIL_PROJECTS_PATH) {
          const correlationId = this.diagnostics.createCorrelationId(
            "vault.rename-projects-root",
          );
          application.markWorkflowRootUnavailable(
            `Required Formal Projects directory moved away from ${TRAIL_PROJECTS_PATH}. Restore it before changing Workflow data.`,
            correlationId,
          );
          return;
        }
        if (
          file.path === TRAIL_PROJECTS_PATH
          || this.isWithinProjects(oldPath)
          || this.isWithinProjects(file.path)
        ) {
          this.refreshWorkflow(application, "vault.rename-projects");
        }
      }),
    );
  }

  private isWithinProjects(path: string): boolean {
    return path === TRAIL_PROJECTS_PATH || path.startsWith(TRAIL_PROJECTS_PREFIX);
  }

  private refreshWorkflowSource(
    application: TrailApplication,
    filePath: string,
    event: string,
  ): void {
    const correlationId = this.diagnostics.createCorrelationId(event);
    this.diagnostics.record("host.vault.workflow-source-change", {
      correlationId,
      data: { event, path: filePath },
    });
    void application.refreshWorkflowSource(filePath, correlationId).catch(
      (error: unknown) => this.recordWorkflowReconcileFailure(
        correlationId,
        error,
        event,
      ),
    );
  }

  private refreshWorkflow(
    application: TrailApplication,
    event: string,
  ): void {
    const correlationId = this.diagnostics.createCorrelationId(event);
    this.diagnostics.record("host.vault.workflow-structure-change", {
      correlationId,
      data: { event },
    });
    void application.refreshWorkflow(correlationId).catch(
      (error: unknown) => this.recordWorkflowReconcileFailure(
        correlationId,
        error,
        event,
      ),
    );
  }

  private recordWorkflowReconcileFailure(
    correlationId: string,
    error: unknown,
    event: string,
  ): void {
    this.diagnostics.record("host.vault.workflow-reconcile-failed", {
      correlationId,
      data: { errorName: errorName(error), event },
      level: "error",
    });
    console.error("Trail Workflow reconciliation failed", error);
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
