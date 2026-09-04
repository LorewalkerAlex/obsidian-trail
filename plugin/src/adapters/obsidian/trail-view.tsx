import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  ItemView,
  type ViewStateResult,
  type WorkspaceLeaf,
} from "obsidian";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailApp } from "../../ui/shell/trail-app";
import {
  trailLocationsEqual,
  type TrailNavigationStore,
} from "../../ui/shell/trail-navigation-state";
import type { TrailUiActions } from "../../ui/shell/trail-ui-actions";
import {
  createTrailViewState,
  readTrailViewState,
  type TrailViewState,
} from "./trail-view-state";

export const TRAIL_VIEW_TYPE = "trail-view";

/** React host bridge. Incremental rendering remains owned by Zustand subscriptions. */
export class TrailView extends ItemView {
  private root: Root | null = null;

  public constructor(
    leaf: WorkspaceLeaf,
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly actions: TrailUiActions,
    private readonly navigationStore: TrailNavigationStore,
  ) {
    super(leaf);
    this.navigation = true;
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

  public getState(): TrailViewState {
    return createTrailViewState(this.navigationStore.getState().location);
  }

  public async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const nextLocation = readTrailViewState(state).location;
    const currentLocation = this.navigationStore.getState().location;
    if (!trailLocationsEqual(currentLocation, nextLocation)) {
      result.history = true;
    }
    this.navigationStore.getState().restore(nextLocation);
    await super.setState(state, result);
  }

  public async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("trail-view");
    const mountElement = this.contentEl.createDiv({ cls: "trail-view__root" });
    this.root = createRoot(mountElement);
    this.root.render(
      <StrictMode>
        <TrailApp
          actions={this.actions}
          navigationStore={this.navigationStore}
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
