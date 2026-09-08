import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailInspector } from "../../ui/shell/trail-inspector";
import type { TrailInspectorStore } from "../../ui/shell/trail-inspector-state";
import type { TrailUiActions } from "../../ui/shell/trail-ui-actions";
import { TRAIL_INSPECTOR_VIEW_TYPE } from "./trail-inspector-host";

/** Host-owned right-sidebar carrier for Trail's persistent Inspector composition. */
export class TrailInspectorView extends ItemView {
  private root: Root | null = null;

  public constructor(
    leaf: WorkspaceLeaf,
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly actions: TrailUiActions,
    private readonly inspectorStore: TrailInspectorStore,
  ) {
    super(leaf);
  }

  public getViewType(): string {
    return TRAIL_INSPECTOR_VIEW_TYPE;
  }

  public getDisplayText(): string {
    return "Trail inspector";
  }

  public getIcon(): string {
    return "panel-right";
  }

  public async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("trail-inspector-view");
    const mountElement = this.contentEl.createDiv({ cls: "trail-inspector-view__root" });
    this.root = createRoot(mountElement);
    this.root.render(
      <StrictMode>
        <TrailInspector
          actions={this.actions}
          inspectorStore={this.inspectorStore}
          runtimeStore={this.runtimeStore}
        />
      </StrictMode>,
    );
  }

  public async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
