import { useState } from "react";

export interface TrailConfirmationState {
  readonly cancel: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

/** Transient confirmation state only; guarded Application semantics stay with the consumer. */
export function useTrailConfirmationState(): TrailConfirmationState {
  const [open, setOpen] = useState(false);
  return {
    cancel: () => setOpen(false),
    onOpenChange: setOpen,
    open,
  };
}
