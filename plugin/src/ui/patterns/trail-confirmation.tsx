import { Dialog } from "radix-ui";
import {
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";

import { useTrailConfirmationState } from "../interactions/trail-confirmation-state";
import { TrailButton } from "../primitives/trail-button";

export type TrailConfirmationTone = "danger" | "default";

export interface TrailConfirmationSurfaceProps {
  readonly actions: ReactNode;
  readonly description: ReactNode;
  readonly title: ReactNode;
}

/** Presentational confirmation surface. Dialog/focus mechanics stay in TrailConfirmation. */
export function TrailConfirmationSurface({
  actions,
  description,
  title,
}: TrailConfirmationSurfaceProps) {
  return (
    <div className="trail-confirmation__surface">
      <div className="trail-confirmation__title">{title}</div>
      <div className="trail-confirmation__description">{description}</div>
      <div className="trail-confirmation__actions">{actions}</div>
    </div>
  );
}

export interface TrailConfirmationProps {
  readonly cancelLabel?: string;
  readonly confirmDisabled?: boolean;
  readonly confirmLabel: string;
  readonly description: ReactNode;
  readonly onConfirm: () => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly returnFocusRef?: RefObject<HTMLElement | null>;
  readonly title: ReactNode;
  readonly tone?: TrailConfirmationTone;
  readonly trigger?: ReactElement;
}

/** Shared guarded-action behavior around the reusable confirmation surface. */
export function TrailConfirmation({
  cancelLabel = "Cancel",
  confirmDisabled = false,
  confirmLabel,
  description,
  onConfirm,
  onOpenChange,
  open,
  returnFocusRef,
  title,
  tone = "default",
  trigger,
}: TrailConfirmationProps) {
  const confirmation = useTrailConfirmationState();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const controlled = open !== undefined;
  const resolvedOpen = controlled ? open : confirmation.open;
  const setOpen = (nextOpen: boolean) => {
    if (!controlled) confirmation.onOpenChange(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog.Root onOpenChange={setOpen} open={resolvedOpen}>
      {trigger === undefined ? null : <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay
          className="trail-confirmation__overlay"
          data-confirmation-backdrop="true"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        />
        <Dialog.Content
          className="trail-confirmation__content"
          onCloseAutoFocus={(event) => {
            if (returnFocusRef?.current === null || returnFocusRef?.current === undefined) return;
            event.preventDefault();
            returnFocusRef.current.focus();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <TrailConfirmationSurface
            actions={(
              <>
                <Dialog.Close asChild>
                  <TrailButton ref={cancelRef}>{cancelLabel}</TrailButton>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <TrailButton
                    data-confirmation-tone={tone}
                    disabled={confirmDisabled}
                    onClick={onConfirm}
                    variant={tone === "default" ? "primary" : undefined}
                  >
                    {confirmLabel}
                  </TrailButton>
                </Dialog.Close>
              </>
            )}
            description={<Dialog.Description>{description}</Dialog.Description>}
            title={<Dialog.Title>{title}</Dialog.Title>}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
