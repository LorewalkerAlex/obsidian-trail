import { Dialog } from "radix-ui";
import type {
  ReactNode,
  RefObject,
} from "react";

import { useTrailComposerDismissState } from "../interactions/trail-composer-state";
import { TrailButton } from "../primitives/trail-button";
import { TrailIconButton } from "../primitives/trail-icon-button";
import { TrailConfirmation } from "./trail-confirmation";

function TrailCloseIcon() {
  return (
    <svg aria-hidden="true" className="trail-composer__close-icon" viewBox="0 0 16 16">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export interface TrailComposerProps {
  readonly canSubmit: boolean;
  readonly children: ReactNode;
  readonly context: ReactNode;
  readonly dirty: boolean;
  readonly feedback?: ReactNode;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  readonly onDismiss: () => void;
  readonly onSubmit: () => void;
  readonly open: boolean;
  readonly pending?: boolean;
  readonly submitLabel: string;
}

/** Shared transient creation shell. Entity fields/defaults and Application submit intent stay outside. */
export function TrailComposer({
  canSubmit,
  children,
  context,
  dirty,
  feedback,
  initialFocusRef,
  onDismiss,
  onSubmit,
  open,
  pending = false,
  submitLabel,
}: TrailComposerProps) {
  const dismiss = useTrailComposerDismissState({
    active: open,
    dirty,
    disabled: pending,
    onDismiss,
  });

  return (
    <>
      <Dialog.Root
        onOpenChange={(nextOpen) => {
          if (!nextOpen) dismiss.requestDismiss();
        }}
        open={open}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="trail-composer__overlay" />
          <Dialog.Content
            className="trail-composer__content"
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              dismiss.requestDismiss();
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
                && (event.ctrlKey || event.metaKey)
                && !event.repeat
              ) {
                event.preventDefault();
                if (canSubmit && !pending) onSubmit();
              }
            }}
            onOpenAutoFocus={(event) => {
              if (initialFocusRef?.current === null || initialFocusRef?.current === undefined) return;
              event.preventDefault();
              initialFocusRef.current.focus();
            }}
            onPointerDownOutside={(event) => {
              event.preventDefault();
              dismiss.requestDismiss();
            }}
          >
            <header className="trail-composer__header">
              <Dialog.Title className="trail-composer__context">{context}</Dialog.Title>
              <TrailIconButton
                disabled={pending}
                icon={<TrailCloseIcon />}
                label="Close composer"
                onClick={dismiss.requestDismiss}
              />
            </header>
            <div className="trail-composer__body">{children}</div>
            {feedback === undefined ? null : (
              <div className="trail-composer__feedback" role="alert">{feedback}</div>
            )}
            <footer className="trail-composer__footer">
              <span className="trail-composer__shortcut">Ctrl/Cmd+Enter</span>
              <TrailButton
                disabled={!canSubmit || pending}
                onClick={onSubmit}
                variant="primary"
              >
                {pending ? "Creating..." : submitLabel}
              </TrailButton>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <TrailConfirmation
        confirmLabel="Discard"
        description="Discard your changes and close this composer?"
        onConfirm={dismiss.confirmDiscard}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) dismiss.cancelDiscard();
        }}
        open={dismiss.discardConfirmationOpen}
        returnFocusRef={initialFocusRef}
        title="Discard changes?"
        tone="danger"
      />
    </>
  );
}
