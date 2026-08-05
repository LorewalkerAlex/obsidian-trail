import {
  getFrontMatterInfo,
  parseYaml,
  Plugin,
} from "obsidian";

import {
  convertFleetingNoteToTaskInVault,
} from "./domain/trail-fleeting-to-task-command";
import { TrailMutationQueue } from "./domain/trail-mutation-queue";
import {
  createObsidianTrailMutationSource,
  updateTaskStatusInVault,
} from "./domain/trail-mutation-service";
import { TrailRuntimeStore } from "./domain/trail-runtime-store";
import {
  createObsidianTrailSource,
  createTrailFrontmatterParser,
  isTrailDataEventPath,
  readTrailVault,
} from "./domain/trail-vault-reader";
import {
  TRAIL_VIEW_TYPE,
  TrailView,
  type TrailFleetingNoteConverter,
  type TrailTaskStatusUpdater,
} from "./trail-view";

const TRAIL_TIME_ZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

export default class TrailPlugin extends Plugin {
  private runtimeStore: TrailRuntimeStore | null = null;
  private mutationQueue: TrailMutationQueue | null = null;

  onload(): void {
    const parseFrontmatter =
      createTrailFrontmatterParser(
        getFrontMatterInfo,
        parseYaml,
      );
    const source = createObsidianTrailSource(
      this.app,
      parseFrontmatter,
    );
    const runtimeStore = new TrailRuntimeStore(
      () => readTrailVault(source),
    );
    const mutationSource =
      createObsidianTrailMutationSource(this.app);
    const mutationQueue = new TrailMutationQueue();

    const updateTaskStatus: TrailTaskStatusUpdater = async (
      task,
      targetStatus,
    ): Promise<void> => {
      await mutationQueue.enqueue(() =>
        runtimeStore.runMutation(async () => {
          await updateTaskStatusInVault(
            mutationSource,
            {
              expectedTask: task,
              targetStatus,
            },
          );
        }),
      );
    };

    const convertFleetingNoteToTask:
      TrailFleetingNoteConverter = async (
        note,
        project,
      ): Promise<void> => {
        const taskId = crypto.randomUUID();
        const taskCreatedAt = createTrailTimestamp(new Date());

        await mutationQueue.enqueue(() =>
          runtimeStore.runMutation(async () => {
            await convertFleetingNoteToTaskInVault(
              mutationSource,
              {
                expectedNote: note,
                targetProjectId: project.id,
                targetProjectPath: project.filePath,
                taskId,
                taskCreatedAt,
              },
            );
          }),
        );
      };

    this.runtimeStore = runtimeStore;
    this.mutationQueue = mutationQueue;

    this.registerView(
      TRAIL_VIEW_TYPE,
      (leaf) => new TrailView(
        leaf,
        runtimeStore,
        updateTaskStatus,
        convertFleetingNoteToTask,
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

function createTrailTimestamp(now: Date): string {
  const trailTime = new Date(
    now.getTime() + TRAIL_TIME_ZONE_OFFSET_MS,
  );

  return `${trailTime.toISOString().slice(0, 19)}+08:00`;
}
