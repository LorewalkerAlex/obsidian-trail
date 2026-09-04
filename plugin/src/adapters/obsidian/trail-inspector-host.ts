import type { Workspace } from "obsidian";

import type {
  TrailInspectorStore,
  TrailInspectorTarget,
} from "../../ui/shell/trail-inspector-state";
import { trailInspectorTargetForLocation } from "../../ui/shell/trail-inspector-state";
import {
  trailLocationsEqual,
  type TrailLocation,
} from "../../ui/shell/trail-navigation-state";

export const TRAIL_INSPECTOR_VIEW_TYPE = "trail-inspector";

/** Calibrated against the main Trail pane, never the global window width. */
export const TRAIL_INSPECTOR_AUTO_REVEAL_MAIN_WIDTH = 960;

type TrailInspectorWorkspace = Pick<
  Workspace,
  "detachLeavesOfType" | "ensureSideLeaf"
>;

function shouldRevealTrailInspector(mainViewWidth: number): boolean {
  return Number.isFinite(mainViewWidth)
    && mainViewWidth >= TRAIL_INSPECTOR_AUTO_REVEAL_MAIN_WIDTH;
}

/**
 * Serializes location-entry host effects so a rapid Back/Forward sequence cannot
 * leave an older Inspector transition applied after a newer Page location.
 */
export class TrailInspectorHost {
  private lastRequestedLocation: TrailLocation | null = null;
  private lastRequestedWidth = 0;
  private transition: Promise<void> = Promise.resolve();

  public constructor(
    private readonly workspace: TrailInspectorWorkspace,
    private readonly inspectorStore: TrailInspectorStore,
  ) {}

  public enterLocation(
    location: TrailLocation,
    mainViewWidth: number,
  ): Promise<void> {
    const target = trailInspectorTargetForLocation(location);
    if (
      this.lastRequestedLocation !== null
      && trailLocationsEqual(this.lastRequestedLocation, location)
      && (
        target === null
        || this.lastRequestedWidth > 0
        || mainViewWidth <= 0
      )
    ) {
      return this.transition;
    }

    this.lastRequestedLocation = location;
    this.lastRequestedWidth = mainViewWidth;

    const requestLocation = location;
    const requestTarget = target;
    const requestWidth = mainViewWidth;
    const next = this.transition
      .catch(() => undefined)
      .then(() => this.apply(requestTarget, requestWidth));

    this.transition = next.catch((error: unknown) => {
      if (
        this.lastRequestedLocation !== null
        && trailLocationsEqual(this.lastRequestedLocation, requestLocation)
      ) {
        this.lastRequestedLocation = null;
        this.lastRequestedWidth = 0;
      }
      throw error;
    });

    return this.transition;
  }

  private async apply(
    target: TrailInspectorTarget | null,
    mainViewWidth: number,
  ): Promise<void> {
    this.inspectorStore.getState().restore(target);

    if (target === null) {
      this.workspace.detachLeavesOfType(TRAIL_INSPECTOR_VIEW_TYPE);
      return;
    }

    const reveal = shouldRevealTrailInspector(mainViewWidth);
    await this.workspace.ensureSideLeaf(
      TRAIL_INSPECTOR_VIEW_TYPE,
      "right",
      { active: reveal, reveal },
    );
  }
}
