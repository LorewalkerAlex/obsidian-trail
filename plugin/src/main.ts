import { Plugin } from "obsidian";

import { TrailMutationQueue } from "./domain/trail-mutation-queue";
import {
  createObsidianTrailMutationSource,
  updateTaskStatusInVault,
} from "./domain/trail-mutation-service";
import { TrailRuntimeStore } from "./domain/trail-runtime-store";
import {
  createObsidianTrailSource,
  isTrailDataEventPath,
  readTrailVault,
} from "./domain/trail-vault-reader";
import { TRAIL_VIEW_TYPE, TrailView } from "./trail-view";

export default class TrailPlugin extends Plugin {
  private runtimeStore: TrailRuntimeStore | null = null;
  private mutationQueue: TrailMutationQueue | null = null;

  onload(): void {
    const source = createObsidianTrailSource(this.app);
    const runtimeStore = new TrailRuntimeStore(
      () => readTrailVault(source),
    );
    const mutationSource =
      createObsidianTrailMutationSource(this.app);
    const mutationQueue = new TrailMutationQueue(
      async (input) => {
        const updatedTask =
          await updateTaskStatusInVault(
            mutationSource,
            input,
          );

        await runtimeStore.refresh();

        return updatedTask;
      },
    );

    this.runtimeStore = runtimeStore;
    this.mutationQueue = mutationQueue;

    this.registerView(
      TRAIL_VIEW_TYPE,
      (leaf) => new TrailView(
        leaf,
        runtimeStore,
        mutationQueue,
      ),
    );

    this.app.workspace.onLayoutReady(() => {
      if (this.runtimeStore !== runtimeStore) {
        return;
      }

      this.registerVaultReconciliation(runtimeStore);
    });

    this.addRibbonIcon("route", "Open trail", () => {
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

  onunload(): void {
    this.mutationQueue?.dispose();
    this.mutationQueue = null;

    this.runtimeStore?.dispose();
    this.runtimeStore = null;
  }

  private registerVaultReconciliation(
    runtimeStore: TrailRuntimeStore,
  ): void {
    const scheduleForPath = (path: string): void => {
      if (isTrailDataEventPath(path)) {
        runtimeStore.scheduleRefresh();
      }
    };

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        scheduleForPath(file.path);
      }),
    );

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        scheduleForPath(file.path);
      }),
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        scheduleForPath(file.path);
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (
          isTrailDataEventPath(file.path)
          || isTrailDataEventPath(oldPath)
        ) {
          runtimeStore.scheduleRefresh();
        }
      }),
    );
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(
      TRAIL_VIEW_TYPE,
    )[0];

    if (!leaf) {
      leaf = workspace.getLeaf("tab");

      await leaf.setViewState({
        type: TRAIL_VIEW_TYPE,
        active: true,
      });
    }

    await workspace.revealLeaf(leaf);
  }
}
