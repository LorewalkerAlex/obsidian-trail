import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { TrailTask } from "./domain/trail-model";
import {
  createObsidianTrailMutationSource,
  updateTaskStatusInVault,
} from "./domain/trail-mutation-service";
import type { TrailRuntimeStore } from "./domain/trail-runtime-store";
import { TrailApp } from "./trail-app";

export const TRAIL_VIEW_TYPE = "trail-view";

export class TrailView extends ItemView {
  private root: Root | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly runtimeStore: TrailRuntimeStore,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return TRAIL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Trail";
  }

  getIcon(): string {
    return "route";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("trail-view");

    const mountElement = this.contentEl.createDiv({
      cls: "trail-view__root",
    });
    this.root = createRoot(mountElement);
    this.unsubscribe = this.runtimeStore.subscribe(
      this.renderSnapshot,
    );

    this.renderSnapshot();
    await this.runtimeStore.initialize();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }

  private readonly handleMarkTaskDoing = async (
    task: TrailTask,
  ): Promise<void> => {
    await updateTaskStatusInVault(
      createObsidianTrailMutationSource(this.app),
      {
        expectedTask: task,
        targetStatus: "doing",
      },
    );

    await this.runtimeStore.refresh();
  };

  private readonly renderSnapshot = (): void => {
    const snapshot = this.runtimeStore.getSnapshot();

    if (!snapshot.isInitialized) {
      return;
    }

    this.root?.render(
      <StrictMode>
        <TrailApp
          data={snapshot.data}
          onMarkTaskDoing={this.handleMarkTaskDoing}
        />
      </StrictMode>,
    );
  };
}