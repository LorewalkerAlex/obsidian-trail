import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailFoundationLab } from "../foundation/trail-foundation-lab";
import type { TrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";

export function TrailApp({
  runtimeStore,
}: {
  readonly actions: TrailUiActions;
  readonly navigationStore: TrailNavigationStore;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const control = useStore(runtimeStore, (state) => state.control);
  const revision = useStore(runtimeStore, (state) => state.committed.revision);

  return (
    <main className="trail-foundation" data-runtime-control={control.kind}>
      <TrailFoundationLab control={control} revision={revision} />
    </main>
  );
}
