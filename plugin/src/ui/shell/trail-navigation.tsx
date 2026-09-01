import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type {
  TrailLocation,
  TrailNavigationStore,
} from "./trail-navigation-state";

export function TrailNavigation({
  navigationStore,
  onNavigate,
}: {
  readonly navigationStore: TrailNavigationStore;
  readonly onNavigate: (location: TrailLocation) => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const location = useStore(navigationStore, (state) => state.location);

  return (
    <nav aria-label="Trail navigation" className="trail-navigation">
      <div className="trail-navigation__header">
        <div className="trail-navigation__identity">
          <span aria-hidden="true" className="trail-navigation__mark" />
          <strong>Trail</strong>
        </div>
      </div>

      <div className="trail-navigation__primary">
        <button
          aria-current={location.kind === "triage" ? "page" : undefined}
          className="trail-navigation__row"
          onClick={() => onNavigate({ kind: "triage" })}
          type="button"
        >
          Triage
        </button>
      </div>
    </nav>
  );
}
