import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { TrailTask } from "./domain/trail-model";

export type TrailTaskModalOpener = (task: TrailTask) => void;

const TrailTaskModalContext = createContext<
  TrailTaskModalOpener | undefined
>(undefined);

export interface TrailTaskModalProviderProps {
  children: ReactNode;
  openTask: TrailTaskModalOpener;
}

export function TrailTaskModalProvider({
  children,
  openTask,
}: TrailTaskModalProviderProps) {
  return (
    <TrailTaskModalContext.Provider value={openTask}>
      {children}
    </TrailTaskModalContext.Provider>
  );
}

export function useTrailTaskModal():
  TrailTaskModalOpener | undefined {
  return useContext(TrailTaskModalContext);
}
