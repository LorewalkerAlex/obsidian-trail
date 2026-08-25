import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailNavigation } from "../../ui/shell/trail-navigation";
import type {
  TrailLocation,
  TrailNavigationStore,
} from "../../ui/shell/trail-navigation-state";

export const TRAIL_NAVIGATION_VIEW_TYPE = "trail-navigation";

/** Host-owned left-sidebar carrier for Trail's navigation composition. */
export class TrailNavigationView extends ItemView {
  private root: Root | null = null;

  public constructor(
    leaf: WorkspaceLeaf,
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly navigationStore: TrailNavigationStore,
    private readonly onNavigate: (location: TrailLocation) => void,
  ) {
    super(leaf);
  }

  public getViewType(): string {
    return TRAIL_NAVIGATION_VIEW_TYPE;
  }

  public getDisplayText(): string {
    return "Trail navigation";
  }

  public getIcon(): string {
    return "route";
  }

  public async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("trail-navigation-view");
    const mountElement = this.contentEl.createDiv({ cls: "trail-navigation-view__root" });
    this.root = createRoot(mountElement);
    this.root.render(
      <StrictMode>
        <TrailNavigation
          navigationStore={this.navigationStore}
          onNavigate={this.onNavigate}
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
