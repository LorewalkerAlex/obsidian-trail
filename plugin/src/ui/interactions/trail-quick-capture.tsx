import { Dialog } from "radix-ui";
import { useRef, useState } from "react";

import type { TrailTriageCreateInput } from "../../application/triage/trail-triage-application";
import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailTimestamp } from "../../domain/model/trail-values";
import { TrailTriageComposer } from "../entities/trail-standard-creation-composers";
import { TrailInput } from "../primitives/trail-input";

export function TrailQuickCapture({
  configuration,
  defaultDue,
  onCreate,
  onDismiss,
}: {
  readonly configuration: TrailConfiguration;
  readonly defaultDue: TrailTimestamp;
  readonly onCreate: (input: TrailTriageCreateInput) => Promise<void>;
  readonly onDismiss: () => void;
}) {
  const [phase, setPhase] = useState<"capture" | "composer">("capture");
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (phase === "composer") {
    return (
      <TrailTriageComposer
        configuration={configuration}
        defaultDue={defaultDue}
        onCreate={onCreate}
        onOpenChange={(open) => {
          if (!open) onDismiss();
        }}
        open
        seedTitle={title}
        seedTitleDirty
      />
    );
  }

  const canExpand = title.trim().length > 0;

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className="trail-composer__overlay" />
        <Dialog.Content
          aria-describedby="trail-quick-capture-description"
          className="trail-quick-capture__content"
          data-trail-transient-layer="modal"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="trail-quick-capture__surface">
            <Dialog.Title className="trail-quick-capture__title">
              Capture to Triage
            </Dialog.Title>
            <Dialog.Description
              className="trail-quick-capture__description"
              id="trail-quick-capture-description"
            >
              Enter a title, then continue in the standard Triage composer.
            </Dialog.Description>
            <TrailInput
              aria-label="Quick Capture title"
              onChange={(event) => setTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing || !canExpand) return;
                event.preventDefault();
                setPhase("composer");
              }}
              placeholder="Capture to Triage..."
              ref={inputRef}
              value={title}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
