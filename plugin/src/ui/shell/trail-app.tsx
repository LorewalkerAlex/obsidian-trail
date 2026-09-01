import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailFoundationLab } from "../foundation/trail-foundation-lab";
import { TrailTriagePage } from "../pages/triage/trail-triage-page";
import type { TrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";
import {
  TrailLocationBar,
  TrailWorkspaceShell,
} from "./trail-workspace-shell";

export function TrailApp({
  navigationStore,
  runtimeStore,
}: {
  readonly actions: TrailUiActions;
  readonly navigationStore: TrailNavigationStore;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const location = useStore(navigationStore, (state) => state.location);
  const control = useStore(runtimeStore, (state) => state.control);
  const revision = useStore(runtimeStore, (state) => state.committed.revision);

  return (
    <main
      className="trail-app"
      data-runtime-control={control.kind}
      data-trail-location={location.kind}
    >
      {location.kind === "triage" ? (
        <TrailWorkspaceShell locationBar={<TrailLocationBar title="Triage" />}>
          <TrailTriagePage runtimeStore={runtimeStore} />
        </TrailWorkspaceShell>
      ) : (
        <div className="trail-foundation">
          <TrailFoundationLab control={control} revision={revision} />
        </div>
      )}
    </main>
  );
}
