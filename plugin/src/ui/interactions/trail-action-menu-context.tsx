import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { TrailActionMenuPresenter } from "./trail-action-menu";

const TrailActionMenuContext = createContext<TrailActionMenuPresenter | null>(null);

export function TrailActionMenuProvider({
  children,
  presenter,
}: {
  readonly children: ReactNode;
  readonly presenter: TrailActionMenuPresenter;
}) {
  return (
    <TrailActionMenuContext.Provider value={presenter}>
      {children}
    </TrailActionMenuContext.Provider>
  );
}

export function useTrailActionMenuPresenter(): TrailActionMenuPresenter | null {
  return useContext(TrailActionMenuContext);
}
