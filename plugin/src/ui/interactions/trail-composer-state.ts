import {
  useEffect,
  useState,
} from "react";

export interface TrailComposerDismissState {
  readonly cancelDiscard: () => void;
  readonly confirmDiscard: () => void;
  readonly discardConfirmationOpen: boolean;
  readonly requestDismiss: () => void;
}

/** Shared transient dismiss/dirty mechanics; draft shape and submit semantics stay with consumers. */
export function useTrailComposerDismissState(input: {
  readonly active: boolean;
  readonly dirty: boolean;
  readonly disabled?: boolean;
  readonly onDismiss: () => void;
}): TrailComposerDismissState {
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!input.active) setDiscardConfirmationOpen(false);
  }, [input.active]);

  return {
    cancelDiscard: () => setDiscardConfirmationOpen(false),
    confirmDiscard: () => {
      setDiscardConfirmationOpen(false);
      input.onDismiss();
    },
    discardConfirmationOpen,
    requestDismiss: () => {
      if (input.disabled) return;
      if (input.dirty) {
        setDiscardConfirmationOpen(true);
        return;
      }
      input.onDismiss();
    },
  };
}
