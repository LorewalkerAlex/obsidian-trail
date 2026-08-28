import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type {
  TrailLocation,
  TrailNavigationStore,
} from "./trail-navigation-state";

function NavigationIcon({ kind }: { readonly kind: "plus" | "search" }) {
  return <span aria-hidden="true" className={`trail-navigation-foundation__action-icon trail-navigation-foundation__action-icon--${kind}`} />;
}

export function TrailNavigation({
  runtimeStore,
}: {
  readonly navigationStore: TrailNavigationStore;
  readonly onNavigate: (location: TrailLocation) => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const controlKind = useStore(runtimeStore, (state) => state.control.kind);

  return (
    <nav aria-label="Trail navigation" className="trail-navigation-foundation">
      <div className="trail-navigation-foundation__header">
        <div className="trail-navigation-foundation__identity">
          <span aria-hidden="true" className="trail-navigation-foundation__mark" />
          <strong>Trail</strong>
        </div>
        <div className="trail-navigation-foundation__actions">
          <button aria-label="Search calibration specimen" type="button">
            <NavigationIcon kind="search" />
          </button>
          <button aria-label="Create calibration specimen" type="button">
            <NavigationIcon kind="plus" />
          </button>
        </div>
      </div>

      <div className="trail-navigation-foundation__section-label">Calibration</div>
      <div aria-current="page" className="trail-navigation-foundation__row">
        <span aria-hidden="true" className="trail-navigation-foundation__row-icon" />
        <span>Foundation lab</span>
      </div>
      <div className="trail-navigation-foundation__reference">Linear dark · 2026 refresh</div>

      <div className="trail-navigation-foundation__runtime">
        <span className="trail-navigation-foundation__runtime-dot" />
        Runtime {controlKind}
      </div>
    </nav>
  );
}
