import { useState } from "react";
import { useStore } from "zustand";

import { formatTrailCalendarDate } from "../../../domain/rules/trail-calendar-date";
import { formatTrailCycleLabel } from "../../../domain/rules/trail-cycle-label";
import {
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
} from "../../../domain/rules/trail-temporal-rules";
import { selectTrailCycleInspectorReadModel } from "../../../query/cycles/trail-cycle-inspector-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import {
  parseTrailCalendarDateInput,
  TrailCalendarDatePicker,
} from "../../patterns/trail-calendar-date-picker";
import { TrailConfirmation } from "../../patterns/trail-confirmation";
import { TrailPropertyControl } from "../../patterns/trail-property-control";
import { TrailViewPopover } from "../../patterns/trail-view-popover";
import { TrailButton } from "../../primitives/trail-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCycleStart } from "./trail-cycle-start";

type TrailCycleInspectorActions = Pick<
  TrailUiActions["cycles"],
  "changePlannedEnd" | "close" | "closeAndStartNext" | "start"
>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function replaceCalendarDate(
  timestamp: number,
  input: string,
  timezone: string,
): number {
  const date = parseTrailCalendarDateInput(input);
  if (date === undefined) throw new Error("Choose a valid planned end date");
  const current = readTrailZonedDateTimeParts(timestamp, timezone);
  return resolveTrailZonedDateTimeParts({ ...current, ...date }, timezone);
}

function TrailCyclePlannedEndEditor({
  disabled,
  onSave,
  timezone,
  value,
}: {
  readonly disabled: boolean;
  readonly onSave: (plannedEnd: number) => Promise<boolean>;
  readonly timezone: string;
  readonly value: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => formatTrailCalendarDate(value, timezone));
  const [validation, setValidation] = useState<string>();
  const [saving, setSaving] = useState(false);

  const setEditorOpen = (nextOpen: boolean) => {
    if (saving) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(formatTrailCalendarDate(value, timezone));
      setValidation(undefined);
    }
  };

  const save = async () => {
    if (saving) return;
    let next: number;
    try {
      next = replaceCalendarDate(value, draft, timezone);
    } catch (error: unknown) {
      setValidation(errorMessage(error));
      return;
    }
    setSaving(true);
    setValidation(undefined);
    try {
      if (await onSave(next)) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const formatted = formatTrailCalendarDate(value, timezone);
  const valueParts = readTrailZonedDateTimeParts(value, timezone);
  const referenceDate = { day: valueParts.day, month: valueParts.month, year: valueParts.year };
  return (
    <TrailViewPopover
      align="end"
      label="Edit planned end"
      onOpenChange={setEditorOpen}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`Planned end: ${formatted}`}
          disabled={disabled}
        >
          {formatted}
        </TrailPropertyControl>
      )}
      width="compact"
    >
      <div className="trail-cycle-inspector__planned-end-editor">
        <div className="trail-view-popover__title">Planned end</div>
        <TrailCalendarDatePicker
          disabled={saving}
          inputLabel="Planned end date"
          onValueChange={setDraft}
          referenceDate={referenceDate}
          value={draft}
        />
        {validation === undefined ? null : (
          <div className="trail-cycle-inspector__feedback" role="alert">{validation}</div>
        )}
        <div className="trail-cycle-inspector__planned-end-actions">
          <TrailButton disabled={saving} onClick={() => setEditorOpen(false)}>Cancel</TrailButton>
          <TrailButton disabled={saving} onClick={() => { void save(); }} variant="primary">
            Save
          </TrailButton>
        </div>
      </div>
    </TrailViewPopover>
  );
}

export function TrailCycleInspector({
  actions,
  cycleId,
  onCycleActivate,
  runtimeStore,
}: {
  readonly actions: TrailCycleInspectorActions;
  readonly cycleId: string;
  readonly onCycleActivate?: (cycleId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const readModel = selectTrailCycleInspectorReadModel(state, cycleId);
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [closeOpen, setCloseOpen] = useState(false);
  const [startNextOpen, setStartNextOpen] = useState(false);

  if (readModel === null) {
    return (
      <aside
        aria-label="Trail inspector"
        className="trail-inspector trail-cycle-inspector"
        data-target-kind="cycle"
      >
        <header className="trail-inspector__header">
          <span className="trail-inspector__eyebrow">Cycle</span>
          <h2>Unavailable</h2>
        </header>
        <p className="trail-inspector__placeholder">Cycle data is not available.</p>
      </aside>
    );
  }

  const timezone = readModel.timezone;
  const cycleLabel = formatTrailCycleLabel(readModel.expectedCycle, timezone);

  const latestCurrentReadModel = () => {
    const latest = selectTrailCycleInspectorReadModel(runtimeStore.getState(), cycleId);
    if (latest?.kind !== "current") throw new Error("This cycle is no longer current.");
    return latest;
  };

  const savePlannedEnd = async (plannedEnd: number): Promise<boolean> => {
    if (readModel.kind !== "current" || lifecyclePending) return false;
    setFeedback(undefined);
    let result: ReturnType<TrailCycleInspectorActions["changePlannedEnd"]>;
    try {
      const latest = latestCurrentReadModel();
      result = actions.changePlannedEnd(latest.expectedCycle, plannedEnd);
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
      return false;
    }
    if (result.kind === "needs-input") {
      setFeedback(result.input.message);
      return false;
    }
    if (result.kind === "unchanged") return true;
    try {
      await result.receipt.completion;
      return true;
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
      return false;
    }
  };

  const closeCycle = async () => {
    if (readModel.kind !== "current" || lifecyclePending) return;
    setFeedback(undefined);
    let receipt: ReturnType<TrailCycleInspectorActions["close"]>;
    try {
      receipt = actions.close(latestCurrentReadModel().expectedCycle);
    } catch (error: unknown) {
      setFeedback(`Close failed: ${errorMessage(error)}`);
      return;
    }
    setLifecyclePending(true);
    try {
      await receipt.completion;
    } catch (error: unknown) {
      setFeedback(`Close failed: ${errorMessage(error)}`);
    } finally {
      setLifecyclePending(false);
    }
  };

  const issueSummary = readModel.kind === "current"
    ? `${readModel.issueCount} ${readModel.issueCount === 1 ? "issue" : "issues"} · ${readModel.unfinishedIssueCount} open`
    : undefined;

  return (
    <>
      <aside
        aria-label="Trail inspector"
        className="trail-inspector trail-cycle-inspector"
        data-target-kind="cycle"
      >
        <section aria-label="Cycle information" className="trail-inspector__section trail-cycle-inspector__section">
          <h3 className="trail-inspector__section-title trail-cycle-inspector__section-title">Info</h3>
          <div className="trail-inspector__metadata trail-cycle-inspector__properties">
            <div className="trail-inspector__metadata-row trail-cycle-inspector__property-row">
              <span className="trail-inspector__metadata-label trail-cycle-inspector__property-label">Effort</span>
              <span className="trail-inspector__metadata-value trail-cycle-inspector__property-value">{readModel.effort}</span>
            </div>
            <div className="trail-inspector__metadata-row trail-cycle-inspector__property-row">
              <span className="trail-inspector__metadata-label trail-cycle-inspector__property-label">Started</span>
              <span className="trail-inspector__metadata-value trail-cycle-inspector__property-value">
                {formatTrailCalendarDate(readModel.startedAt, timezone)}
              </span>
            </div>
            <div className="trail-inspector__metadata-row trail-cycle-inspector__property-row">
              <span className="trail-inspector__metadata-label trail-cycle-inspector__property-label">Planned end</span>
              <span className="trail-inspector__metadata-value trail-cycle-inspector__property-value">
                {readModel.kind === "current" ? (
                  <TrailCyclePlannedEndEditor
                    disabled={lifecyclePending || state.control.kind !== "ready"}
                    onSave={savePlannedEnd}
                    timezone={timezone}
                    value={readModel.plannedEnd}
                  />
                ) : formatTrailCalendarDate(readModel.plannedEnd, timezone)}
              </span>
            </div>
            {readModel.kind === "historical" ? (
              <div className="trail-inspector__metadata-row trail-cycle-inspector__property-row">
                <span className="trail-inspector__metadata-label trail-cycle-inspector__property-label">Closed</span>
                <span className="trail-inspector__metadata-value trail-cycle-inspector__property-value">
                  {formatTrailCalendarDate(readModel.endedAt, timezone)}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {readModel.kind === "current" ? (
          <section aria-label="Cycle actions" className="trail-inspector__section trail-cycle-inspector__section trail-cycle-inspector__actions">
            <TrailButton
              disabled={lifecyclePending || state.control.kind !== "ready"}
              onClick={() => setCloseOpen(true)}
            >
              Close cycle
            </TrailButton>
          </section>
        ) : null}

        {feedback === undefined ? null : (
          <div className="trail-cycle-inspector__feedback" role="alert">{feedback}</div>
        )}
      </aside>

      {readModel.kind !== "current" ? null : (
        <TrailConfirmation
          alternateConfirm={{
            disabled: lifecyclePending,
            label: "Close and start next",
            onConfirm: () => setStartNextOpen(true),
          }}
          confirmDisabled={lifecyclePending}
          confirmLabel="Close"
          description={(
            <span className="trail-cycle-inspector__close-description">
              <strong>{cycleLabel}</strong>
              <span>{issueSummary}</span>
            </span>
          )}
          onConfirm={() => { void closeCycle(); }}
          onOpenChange={setCloseOpen}
          open={closeOpen}
          title="Close cycle?"
          tone="danger"
        />
      )}

      {!startNextOpen ? null : (
        <TrailCycleStart
          actions={actions}
          onDismiss={() => setStartNextOpen(false)}
          onStarted={(nextCycleId) => {
            setStartNextOpen(false);
            onCycleActivate?.(nextCycleId);
          }}
          runtimeStore={runtimeStore}
          sourceCycleId={cycleId}
        />
      )}
    </>
  );
}
