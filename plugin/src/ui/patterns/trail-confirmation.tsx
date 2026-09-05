import { Dialog } from "radix-ui";
import {
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";

import { useTrailConfirmationState } from "../interactions/trail-confirmation-state";
import { TrailButton } from "../primitives/trail-button";

export type TrailConfirmationTone = "danger" | "default";

export interface TrailConfirmationProps {
  readonly cancelLabel?: string;
  readonly confirmLabel: string;
  readonly description: ReactNode;
  readonly onConfirm: () => void;
  readonly title: ReactNode;
  readonly tone?: TrailConfirmationTone;
  readonly trigger: ReactElement;
}

/** Shared guarded-action surface. Semantic consequence copy stays with the consumer. */
export function TrailConfirmation({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  onConfirm,
  title,
  tone = "default",
  trigger,
}: TrailConfirmationProps) {
  const confirmation = useTrailConfirmationState();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root onOpenChange={confirmation.onOpenChange} open={confirmation.open}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className="trail-confirmation__overlay"
          data-confirmation-backdrop="true"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) confirmation.cancel();
          }}
        />
        <Dialog.Content
          className="trail-confirmation__content"
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
