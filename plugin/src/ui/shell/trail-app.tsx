import { useStore } from "zustand";

import type { TrailRuntimeControl } from "../../runtime/control/trail-runtime-control";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";

function runtimeLabel(control: TrailRuntimeControl): string {
  switch (control.kind) {
    case "loading": return "Runtime: loading";
    case "ready": return "Runtime: ready";
    case "refreshing": return "Runtime: refreshing";
    case "read-only-error": return "Runtime: read only";
  }
}

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
    <main
      className="trail-foundation"
      data-runtime-control={control.kind}
      data-runtime-revision={revision}
    >
      <section aria-labelledby="trail-foundation-title" className="trail-foundation__content">
        <p className="trail-foundation__product">Trail</p>
        <h1 id="trail-foundation-title">Interface foundation</h1>
        <p className="trail-foundation__description">
          The active product presentation has been cleared for the new Trail visual system.
        </p>
        <p aria-live="polite" className="trail-foundation__runtime">
          {runtimeLabel(control)}
        </p>
      </section>
    </main>
  );
}
