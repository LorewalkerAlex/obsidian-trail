import { useState } from "react";
import { useStore } from "zustand";

import { resolveTrailTriageDefaultDue } from "../../../domain/rules/trail-temporal-rules";
import { selectTrailReadableConfiguration } from "../../../query/shared/trail-effective-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailIconButton } from "../../primitives/trail-icon-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailTriageComposer } from "./trail-triage-composer";
import { TrailTriagePage } from "./trail-triage-page";

type TrailTriagePageFrameActions = Pick<
  TrailUiActions["triage"],
  "create" | "defer" | "delete" | "edit"
>;

function TrailAddIcon() {
  return (
    <svg aria-hidden="true" className="trail-triage-page-frame__add-icon" viewBox="0 0 16 16">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

/** Triage-owned Page identity around the queue/review composition and creation entry. */
export function TrailTriagePageFrame({
  actions,
  runtimeStore,
}: {
  readonly actions: TrailTriagePageFrameActions;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const configuration = useStore(runtimeStore, selectTrailReadableConfiguration);
  const [composerInvocation, setComposerInvocation] = useState<{
    readonly configuration: NonNullable<typeof configuration>;
    readonly defaultDue: number;
  } | null>(null);

  const openComposer = () => {
    if (configuration === null) return;
    setComposerInvocation({
      configuration,
      defaultDue: resolveTrailTriageDefaultDue(Date.now(), configuration.temporal.timezone),
    });
  };

  return (
    <div className="trail-triage-page-frame">
      <header className="trail-triage-page-frame__header">
        <h1 className="trail-triage-page-frame__title">Triage</h1>
        <TrailIconButton
          disabled={configuration === null}
          icon={<TrailAddIcon />}
          label="Add to Triage"
          onClick={openComposer}
        />
      </header>
      <div className="trail-triage-page-frame__content">
        <TrailTriagePage actions={actions} runtimeStore={runtimeStore} />
      </div>
      {composerInvocation === null ? null : (
        <TrailTriageComposer
          actions={actions}
          configuration={composerInvocation.configuration}
          defaultDue={composerInvocation.defaultDue}
          onOpenChange={(open) => {
            if (!open) setComposerInvocation(null);
          }}
          open
        />
      )}
    </div>
  );
}
