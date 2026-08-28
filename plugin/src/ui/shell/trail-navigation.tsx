import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type {
  TrailLocation,
  TrailNavigationStore,
} from "./trail-navigation-state";

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
      <div className="trail-navigation-foundation__content">
        <strong className="trail-navigation-foundation__product">Trail</strong>
        <span className="trail-navigation-foundation__label">Interface foundation</span>
        <span className="trail-navigation-foundation__runtime">{controlKind}</span>
      </div>
    </nav>
  );
}
