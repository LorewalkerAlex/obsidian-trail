import { useState } from "react";
import { useStore } from "zustand";

import type { TrailInitiative } from "../../../domain/model/trail-entities";
import {
  selectTrailInitiativeInspectorReadModel,
  type TrailInitiativeInspectorReadModel,
} from "../../../query/projects/trail-initiative-inspector-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailLabelPropertySelect } from "../../entities/trail-label-property-select";
import { TrailOptionalDuePropertySelect } from "../../entities/trail-optional-due-property-select";
import { TrailPriorityPropertySelect } from "../../entities/trail-priority-property-select";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

type TrailInitiativeInspectorActions = Pick<
  TrailUiActions["initiatives"],
  "editProperties"
>;

type TrailInitiativePropertyPatch =
  | { readonly kind: "due"; readonly value: TrailInitiative["due"] }
  | { readonly kind: "labels"; readonly value: readonly string[] }
  | { readonly kind: "priority"; readonly value: TrailInitiative["priority"] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nextInitiativeProperties(
  readModel: TrailInitiativeInspectorReadModel,
  patch: TrailInitiativePropertyPatch,
) {
  return {
    description: readModel.expectedInitiative.description,
    due: patch.kind === "due" ? patch.value : readModel.due,
    labelIds: patch.kind === "labels" ? patch.value : readModel.labelIds,
    priority: patch.kind === "priority" ? patch.value : readModel.priority,
    title: readModel.title,
  };
}

export interface TrailInitiativeInspectorProps {
  readonly actions: TrailInitiativeInspectorActions;
  readonly initiativeId: string;
  readonly runtimeStore: TrailRuntimeStore;
}

export function TrailInitiativeInspector({
  actions,
  initiativeId,
  runtimeStore,
}: TrailInitiativeInspectorProps) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const readModel = selectTrailInitiativeInspectorReadModel(state, initiativeId);
  const [feedback, setFeedback] = useState<string>();

  if (readModel === null) {
    return (
      <aside
        aria-label="Trail inspector"
        className="trail-inspector trail-initiative-inspector"
        data-target-kind="initiative"
      >
        <header className="trail-inspector__header">
          <span className="trail-inspector__eyebrow">Initiative</span>
          <h2>Unavailable</h2>
        </header>
        <p className="trail-inspector__placeholder">
          Initiative data is not available.
        </p>
      </aside>
    );
  }

  const latestReadModel = (): TrailInitiativeInspectorReadModel => {
    const latest = selectTrailInitiativeInspectorReadModel(runtimeStore.getState(), initiativeId);
    if (latest === null) throw new Error("This initiative is no longer available.");
    return latest;
  };

  const save = async (patch: TrailInitiativePropertyPatch): Promise<void> => {
    setFeedback(undefined);

    let result: ReturnType<TrailInitiativeInspectorActions["editProperties"]>;
    try {
      const latest = latestReadModel();
      result = actions.editProperties(
        latest.expectedInitiative,
        nextInitiativeProperties(latest, patch),
      );
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
      return;
    }

    if (result.kind === "needs-input") {
      setFeedback(result.input.message);
      return;
    }
    if (result.kind === "unchanged") return;

    try {
      await result.receipt.completion;
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
    }
  };

  const disabled = state.control.kind !== "ready";

  return (
    <aside
      aria-label="Trail inspector"
      className="trail-inspector trail-initiative-inspector"
      data-target-kind="initiative"
    >
      <section
        aria-label="Initiative properties"
        className="trail-inspector__section trail-initiative-inspector__section"
      >
        <h3 className="trail-inspector__section-title trail-initiative-inspector__section-title">Properties</h3>
        <div className="trail-inspector__metadata trail-initiative-inspector__properties">
          <div className="trail-inspector__metadata-row trail-initiative-inspector__property-row">
            <span className="trail-inspector__metadata-label trail-initiative-inspector__property-label">Priority</span>
            <span className="trail-inspector__metadata-value trail-initiative-inspector__property-control">
              <TrailPriorityPropertySelect
                disabled={disabled}
                onValueChange={(priority) => { void save({ kind: "priority", value: priority }); }}
                value={readModel.priority}
              />
            </span>
          </div>
          <div className="trail-inspector__metadata-row trail-initiative-inspector__property-row">
            <span className="trail-inspector__metadata-label trail-initiative-inspector__property-label">Labels</span>
            <span className="trail-inspector__metadata-value trail-initiative-inspector__property-control">
              <TrailLabelPropertySelect
                disabled={disabled}
                entityType="initiative"
                groups={readModel.configuration.labelGroups}
                labels={readModel.configuration.labels}
                onValueChange={(labelIds) => { void save({ kind: "labels", value: labelIds }); }}
                value={readModel.labelIds}
              />
            </span>
          </div>
          <div className="trail-inspector__metadata-row trail-initiative-inspector__property-row">
            <span className="trail-inspector__metadata-label trail-initiative-inspector__property-label">Due</span>
            <span className="trail-inspector__metadata-value trail-initiative-inspector__property-control">
              <TrailOptionalDuePropertySelect
                disabled={disabled}
                onValueChange={(due) => { void save({ kind: "due", value: due }); }}
                referenceTimestamp={Date.now()}
                timezone={readModel.configuration.temporal.timezone}
                value={readModel.due}
              />
            </span>
          </div>
        </div>
      </section>

      {feedback === undefined ? null : (
        <div className="trail-initiative-inspector__feedback" role="alert">{feedback}</div>
      )}
    </aside>
  );
}
