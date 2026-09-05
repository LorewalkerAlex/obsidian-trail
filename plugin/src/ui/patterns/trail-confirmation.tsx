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

export interface TrailConfirmationProps {
  readonly cancelLabel?: string;
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

/** Shared guarded-action surface. Semantic consequence copy stays with the consumer. */
export function TrailConfirmation({
  cancelLabel = "Cancel",
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
          <Dialog.Title className="trail-confirmation__title">{title}</Dialog.Title>
          <Dialog.Description className="trail-confirmation__description">
            {description}
          </Dialog.Description>
          <div className="trail-confirmation__actions">
            <Dialog.Close asChild>
              <TrailButton ref={cancelRef}>{cancelLabel}</TrailButton>
            </Dialog.Close>
            <Dialog.Close asChild>
              <TrailButton
                data-confirmation-tone={tone}
                onClick={onConfirm}
                variant={tone === "default" ? "primary" : undefined}
              >
                {confirmLabel}
              </TrailButton>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
