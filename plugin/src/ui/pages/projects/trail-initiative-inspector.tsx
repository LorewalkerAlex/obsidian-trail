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
  const [pending, setPending] = useState(false);

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

  const save = async (patch: TrailInitiativePropertyPatch): Promise<void> => {
    if (pending) return;
    setFeedback(undefined);

    let result: ReturnType<TrailInitiativeInspectorActions["editProperties"]>;
    try {
      result = actions.editProperties(
        readModel.expectedInitiative,
        nextInitiativeProperties(readModel, patch),
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

    setPending(true);
    try {
      await result.receipt.completion;
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <aside
      aria-label="Trail inspector"
      className="trail-inspector trail-initiative-inspector"
      data-target-kind="initiative"
    >
      <header className="trail-inspector__header">
        <span className="trail-inspector__eyebrow">Initiative</span>
        <h2>{readModel.title}</h2>
      </header>

      <section
        aria-label="Initiative properties"
        className="trail-initiative-inspector__section"
      >
        <h3 className="trail-initiative-inspector__section-title">Properties</h3>
        <div className="trail-initiative-inspector__properties">
          <div className="trail-initiative-inspector__property-row">
            <span className="trail-initiative-inspector__property-label">Priority</span>
            <span className="trail-initiative-inspector__property-control">
              <TrailPriorityPropertySelect
                disabled={pending}
                onValueChange={(priority) => { void save({ kind: "priority", value: priority }); }}
                value={readModel.priority}
              />
            </span>
          </div>
          <div className="trail-initiative-inspector__property-row">
            <span className="trail-initiative-inspector__property-label">Labels</span>
            <span className="trail-initiative-inspector__property-control">
              <TrailLabelPropertySelect
                disabled={pending}
                entityType="initiative"
                groups={readModel.configuration.labelGroups}
                labels={readModel.configuration.labels}
                onValueChange={(labelIds) => { void save({ kind: "labels", value: labelIds }); }}
                value={readModel.labelIds}
              />
            </span>
          </div>
          <div className="trail-initiative-inspector__property-row">
            <span className="trail-initiative-inspector__property-label">Due</span>
            <span className="trail-initiative-inspector__property-control">
              <TrailOptionalDuePropertySelect
                disabled={pending}
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
