import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, type WorkspaceLeaf } from "obsidian";

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
    this.root.render(
      <StrictMode>
        <TrailApp />
      </StrictMode>,
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
