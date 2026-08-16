import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailApp } from "../../ui/shell/trail-app";
import type { TrailUiActions } from "../../ui/shell/trail-ui-actions";

export const TRAIL_VIEW_TYPE = "trail-view";

/** React host bridge. Incremental rendering remains owned by Zustand subscriptions. */
export class TrailView extends ItemView {
  private root: Root | null = null;

  public constructor(
    leaf: WorkspaceLeaf,
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly actions: TrailUiActions,
  ) {
    super(leaf);
  }

  public getViewType(): string {
    return TRAIL_VIEW_TYPE;
  }

  public getDisplayText(): string {
    return "Trail";
  }

  public getIcon(): string {
    return "route";
  }

  public async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("trail-view");
    const mountElement = this.contentEl.createDiv({ cls: "trail-view__root" });
    this.root = createRoot(mountElement);
    this.root.render(
      <StrictMode>
        <TrailApp actions={this.actions} runtimeStore={this.runtimeStore} />
      </StrictMode>,
    );
  }

  public async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
