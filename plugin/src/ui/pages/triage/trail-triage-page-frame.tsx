import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailTriagePage } from "./trail-triage-page";

type TrailTriagePageFrameActions = Pick<
  TrailUiActions["triage"],
  "defer" | "delete" | "edit"
>;

/** Triage-owned Page identity around the existing queue/review composition. */
export function TrailTriagePageFrame({
  actions,
  runtimeStore,
}: {
  readonly actions: TrailTriagePageFrameActions;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  return (
    <div className="trail-triage-page-frame">
      <header className="trail-triage-page-frame__header">
        <h1 className="trail-triage-page-frame__title">Triage</h1>
      </header>
      <div className="trail-triage-page-frame__content">
        <TrailTriagePage actions={actions} runtimeStore={runtimeStore} />
      </div>
    </div>
  );
}
