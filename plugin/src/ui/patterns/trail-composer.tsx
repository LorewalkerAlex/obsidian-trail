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

export interface TrailComposerSurfaceProps {
  readonly canSubmit: boolean;
  readonly children: ReactNode;
  readonly context: ReactNode;
  readonly feedback?: ReactNode;
  readonly onDismiss?: () => void;
  readonly onSubmit: () => void;
  readonly pending?: boolean;
  readonly submitLabel: string;
}

/** Presentational Composer surface. Modal/focus/dismiss-stack mechanics stay in TrailComposer. */
export function TrailComposerSurface({
  canSubmit,
  children,
  context,
  feedback,
  onDismiss,
  onSubmit,
  pending = false,
  submitLabel,
}: TrailComposerSurfaceProps) {
  return (
    <div className="trail-composer__surface">
      <header className="trail-composer__header">
        <div className="trail-composer__context">{context}</div>
        {onDismiss === undefined ? null : (
          <TrailIconButton
            disabled={pending}
            icon={<TrailCloseIcon />}
            label="Close composer"
            onClick={onDismiss}
          />
        )}
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
    </div>
  );
}

export interface TrailComposerProps extends TrailComposerSurfaceProps {
  readonly dirty: boolean;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  readonly onDismiss: () => void;
  readonly open: boolean;
}

/** Shared transient creation behavior around the reusable Composer surface. */
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
            <Dialog.Title className="trail-composer__dialog-title">{context}</Dialog.Title>
            <TrailComposerSurface
              canSubmit={canSubmit}
              context={context}
              feedback={feedback}
              onDismiss={dismiss.requestDismiss}
              onSubmit={onSubmit}
              pending={pending}
              submitLabel={submitLabel}
            >
              {children}
            </TrailComposerSurface>
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
