import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Component,
  ItemView,
  MarkdownRenderer,
  type ViewStateResult,
  type WorkspaceLeaf,
} from "obsidian";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailMarkdownRender } from "../../ui/patterns/trail-page-narrative";
import { TrailApp } from "../../ui/shell/trail-app";
import {
  trailLocationsEqual,
  type TrailLocation,
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

  private async navigate(location: TrailLocation): Promise<void> {
    const currentViewState = this.leaf.getViewState();
    const currentLocation = readTrailViewState(currentViewState.state).location;
    if (trailLocationsEqual(currentLocation, location)) return;

    await this.leaf.setViewState({
      ...currentViewState,
      active: true,
      state: createTrailViewState(location),
      type: TRAIL_VIEW_TYPE,
    });
  }

  private readonly renderMarkdown: TrailMarkdownRender = (markdown, container) => {
    const renderOwner = this.addChild(new Component());
    let active = true;
    const dispose = () => {
      if (!active) return;
      active = false;
      this.removeChild(renderOwner);
    };
    const completion = MarkdownRenderer.render(
      this.app,
      markdown,
      container,
      "",
      renderOwner,
    ).catch((error: unknown) => {
      dispose();
      throw error;
    });

    return { completion, dispose };
  };

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
          onNavigate={(location) => {
            void this.navigate(location);
          }}
          renderMarkdown={this.renderMarkdown}
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
