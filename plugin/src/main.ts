import {
  parseYaml,
  Plugin,
  TFile,
  TFolder,
  type TAbstractFile,
} from "obsidian";

import { TrailApplication } from "./domain/trail-application";
import { createFormalMarkdownValidator } from "./domain/trail-managed-markdown";
import { TrailMutationQueue } from "./domain/trail-mutation-queue";
import { TRAIL_TRIAGE_PATH } from "./domain/trail-physical-schema";
import { createTrailRuntimeStore } from "./domain/trail-runtime";
import { createObsidianTriagePersistenceGateway } from "./domain/trail-triage-persistence-obsidian";
import {
  createObsidianWorkspaceBootstrapGateway,
  type ObsidianWorkspaceFileKinds,
} from "./domain/trail-workspace-obsidian";
import {
  TRAIL_VIEW_TYPE,
  TrailView,
} from "./trail-view";

function resolveHostTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone.trim() === "" ? "UTC" : timezone;
}

const fileKinds: ObsidianWorkspaceFileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile => file instanceof TFile,
  isFolder: (file: TAbstractFile | null): file is TFolder => file instanceof TFolder,
};

export default class TrailPlugin extends Plugin {
  private application: TrailApplication | null = null;

  public onload(): void {
    const runtimeStore = createTrailRuntimeStore();
    const mutationQueue = new TrailMutationQueue();
    const parseYamlDocument = (yaml: string): unknown => parseYaml(yaml);
    const workspaceGateway = createObsidianWorkspaceBootstrapGateway(
      this.app,
      {
        loadData: () => this.loadData(),
        saveData: (data) => this.saveData(data),
      },
      createFormalMarkdownValidator(parseYamlDocument),
      fileKinds,
    );
    const triagePersistence = createObsidianTriagePersistenceGateway(
      this.app,
      parseYamlDocument,
      fileKinds,
    );
    const application = new TrailApplication({
      createId: () => crypto.randomUUID(),
      mutationQueue,
      now: () => Date.now(),
      persistence: triagePersistence,
      resolveHostTimezone,
      runtimeStore,
      workspace: workspaceGateway,
    });

    this.application = application;

    this.registerView(
      TRAIL_VIEW_TYPE,
      (leaf) => new TrailView(leaf, runtimeStore, application),
    );

    this.app.workspace.onLayoutReady(() => {
      if (this.application !== application) {
        return;
      }
      void this.initializeAfterLayout(application);
    });

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
  }

  public onunload(): void {
    this.application?.dispose();
    this.application = null;
  }

  private async initializeAfterLayout(
    application: TrailApplication,
  ): Promise<void> {
    try {
      const classification = await application.initialize();
      if (!classification.canLoad || this.application !== application) {
        return;
      }
      this.registerTriageEvents(application);
    } catch (error: unknown) {
      console.error("Trail Formal initialization failed", error);
    }
  }

  private registerTriageEvents(application: TrailApplication): void {
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file.path === TRAIL_TRIAGE_PATH) {
          void application.refreshTriage().catch((error: unknown) => {
            console.error("Trail Triage reconciliation failed", error);
          });
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file.path === TRAIL_TRIAGE_PATH) {
          application.markRequiredTriageUnavailable(
            `Required Formal Triage file was removed: ${TRAIL_TRIAGE_PATH}. Restore it and reload Trail; it will not be silently recreated.`,
          );
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (oldPath === TRAIL_TRIAGE_PATH || file.path === TRAIL_TRIAGE_PATH) {
          application.markRequiredTriageUnavailable(
            `Required Formal Triage path changed. Restore ${TRAIL_TRIAGE_PATH} and reload Trail.`,
          );
        }
      }),
    );
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(TRAIL_VIEW_TYPE)[0];

    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({
        active: true,
        type: TRAIL_VIEW_TYPE,
      });
    }

    await workspace.revealLeaf(leaf);
  }
}
