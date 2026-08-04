import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { TrailTask } from "./domain/trail-model";
import {
  createObsidianTrailMutationSource,
  updateTaskStatusInVault,
} from "./domain/trail-mutation-service";
import {
  createObsidianTrailSource,
  readTrailVault,
  type TrailVaultReadResult,
} from "./domain/trail-vault-reader";
import { TrailApp } from "./trail-app";

export const TRAIL_VIEW_TYPE = "trail-view";

export class TrailView extends ItemView {
  private root: Root | null = null;

  constructor(leaf: WorkspaceLeaf) {
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

    await this.renderData();
  }

  async onClose(): Promise<void> {
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

    await this.renderData();
  };

  private async renderData(): Promise<void> {
    const data = await this.readData();

    this.root?.render(
      <StrictMode>
        <TrailApp
          data={data}
          onMarkTaskDoing={this.handleMarkTaskDoing}
        />
      </StrictMode>,
    );
  }

  private async readData(): Promise<TrailVaultReadResult> {
    try {
      return await readTrailVault(
        createObsidianTrailSource(this.app),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown Vault read error.";

      return {
        areas: [],
        projects: [],
        issues: [
          {
            scope: "file",
            code: "vault.read.failed",
            message: `Trail could not read the Vault: ${message}`,
            filePath: "Trail",
          },
        ],
      };
    }
  }
}