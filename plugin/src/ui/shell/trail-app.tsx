import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TRAIL_DEVELOPMENT_UI_ENABLED } from "../../trail-build-flags";
import { TrailFoundationLab } from "../foundation/trail-foundation-lab";
import { TrailTriagePageFrame } from "../pages/triage/trail-triage-page-frame";
import type {
  TrailLocation,
  TrailNavigationStore,
  TrailProductLocation,
} from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";
import {
  TrailPageSurface,
  TrailWorkspaceFrame,
} from "./trail-workspace-shell";

function productPageTitle(location: TrailProductLocation): string {
  switch (location.kind) {
    case "cycle":
      return "Cycle";
    case "cycles":
      return "Cycles";
    case "home":
      return "Home";
    case "initiative":
      return "Initiative";
    case "issue":
      return "Issue";
    case "project":
      return "Project";
    case "projects":
      return "Projects";
    case "triage":
      return "Triage";
  }
}

function TrailPendingProductPage({
  location,
}: {
  readonly location: TrailProductLocation;
}) {
  return (
    <section className="trail-product-placeholder">
      <h1>{productPageTitle(location)}</h1>
      <p>This page has not been implemented yet.</p>
    </section>
  );
}

function visibleLocation(
  location: TrailLocation,
  showDevelopment: boolean,
): TrailLocation {
  return location.kind === "foundation" && !showDevelopment
    ? { kind: "home" }
    : location;
}

export function TrailApp({
  actions,
  navigationStore,
  runtimeStore,
  showDevelopment = TRAIL_DEVELOPMENT_UI_ENABLED,
}: {
  readonly actions: TrailUiActions;
  readonly navigationStore: TrailNavigationStore;
  readonly runtimeStore: TrailRuntimeStore;
  readonly showDevelopment?: boolean;
}) {
  const location = useStore(navigationStore, (state) => state.location);
  const control = useStore(runtimeStore, (state) => state.control);
  const revision = useStore(runtimeStore, (state) => state.committed.revision);
  const currentLocation = visibleLocation(location, showDevelopment);

  return (
    <main
      className="trail-app"
      data-runtime-control={control.kind}
      data-trail-location={currentLocation.kind}
    >
      <TrailWorkspaceFrame>
        {currentLocation.kind === "foundation" ? (
          <TrailPageSurface scroll="page">
            <div className="trail-foundation">
              <TrailFoundationLab control={control} revision={revision} />
            </div>
          </TrailPageSurface>
        ) : currentLocation.kind === "triage" ? (
          <TrailPageSurface>
            <TrailTriagePageFrame
              actions={actions.triage}
              runtimeStore={runtimeStore}
            />
          </TrailPageSurface>
        ) : (
          <TrailPageSurface inset="page" scroll="page">
            <TrailPendingProductPage location={currentLocation} />
          </TrailPageSurface>
        )}
      </TrailWorkspaceFrame>
    </main>
  );
}
