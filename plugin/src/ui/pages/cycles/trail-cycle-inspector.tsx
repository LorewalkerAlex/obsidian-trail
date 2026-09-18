import { useState } from "react";
import { useStore } from "zustand";

import {
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
} from "../../../domain/rules/trail-temporal-rules";
import { selectTrailCycleInspectorReadModel } from "../../../query/cycles/trail-cycle-inspector-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailConfirmation } from "../../patterns/trail-confirmation";
import { TrailPropertyControl } from "../../patterns/trail-property-control";
import { TrailViewPopover } from "../../patterns/trail-view-popover";
import { TrailButton } from "../../primitives/trail-button";
import { TrailInput } from "../../primitives/trail-input";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCycleStart } from "./trail-cycle-start";

type TrailCycleInspectorActions = Pick<
  TrailUiActions["cycles"],
  "changePlannedEnd" | "close" | "closeAndStartNext" | "start"
>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatCycleDate(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatCycleRange(startedAt: number, plannedEnd: number, timezone: string): string {
  const short = (timestamp: number) => new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(timestamp));
  return `${short(startedAt)} – ${short(plannedEnd)}`;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function dateInputValue(timestamp: number, timezone: string): string {
  const parts = readTrailZonedDateTimeParts(timestamp, timezone);
  return `${parts.year}-${twoDigits(parts.month)}-${twoDigits(parts.day)}`;
}

function replaceCalendarDate(
  timestamp: number,
  input: string,
  timezone: string,
): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (match === null) throw new Error("Choose a valid planned end date");
  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  const day = Number.parseInt(match[3] ?? "", 10);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() + 1 !== month
    || normalized.getUTCDate() !== day
  ) {
    throw new Error("Choose a valid planned end date");
  }
  const current = readTrailZonedDateTimeParts(timestamp, timezone);
  return resolveTrailZonedDateTimeParts({ ...current, day, month, year }, timezone);
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
  const [draft, setDraft] = useState(() => dateInputValue(value, timezone));
  const [validation, setValidation] = useState<string>();
  const [saving, setSaving] = useState(false);

  const setEditorOpen = (nextOpen: boolean) => {
    if (saving) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(dateInputValue(value, timezone));
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

  const formatted = formatCycleDate(value, timezone);
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
        <TrailInput
          aria-label="Planned end date"
          disabled={saving}
          onChange={(event) => setDraft(event.currentTarget.value)}
          type="date"
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
  const [pending, setPending] = useState(false);
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
  const range = formatCycleRange(readModel.startedAt, readModel.plannedEnd, timezone);

  const savePlannedEnd = async (plannedEnd: number): Promise<boolean> => {
    if (readModel.kind !== "current" || pending) return false;
    setFeedback(undefined);
    let result: ReturnType<TrailCycleInspectorActions["changePlannedEnd"]>;
    try {
      result = actions.changePlannedEnd(readModel.expectedCycle, plannedEnd);
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
      return false;
    }
    if (result.kind === "needs-input") {
      setFeedback(result.input.message);
      return false;
    }
    if (result.kind === "unchanged") return true;
    setPending(true);
    try {
      await result.receipt.completion;
      return true;
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
      return false;
    } finally {
      setPending(false);
    }
  };

  const closeCycle = async () => {
    if (readModel.kind !== "current" || pending) return;
    setFeedback(undefined);
    let receipt: ReturnType<TrailCycleInspectorActions["close"]>;
    try {
      receipt = actions.close(readModel.expectedCycle);
    } catch (error: unknown) {
      setFeedback(`Close failed: ${errorMessage(error)}`);
      return;
    }
    setPending(true);
    try {
      await receipt.completion;
    } catch (error: unknown) {
      setFeedback(`Close failed: ${errorMessage(error)}`);
    } finally {
      setPending(false);
    }
  };

  const issueLabel = `${readModel.issueCount} ${readModel.issueCount === 1 ? "issue" : "issues"}`;
  const issueRelation = `${issueLabel} ${readModel.issueCount === 1 ? "is" : "are"} currently in this cycle.`;

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
                {formatCycleDate(readModel.startedAt, timezone)}
              </span>
            </div>
            <div className="trail-inspector__metadata-row trail-cycle-inspector__property-row">
              <span className="trail-inspector__metadata-label trail-cycle-inspector__property-label">Planned end</span>
              <span className="trail-inspector__metadata-value trail-cycle-inspector__property-value">
                {readModel.kind === "current" ? (
                  <TrailCyclePlannedEndEditor
                    disabled={pending || state.control.kind !== "ready"}
                    onSave={savePlannedEnd}
                    timezone={timezone}
                    value={readModel.plannedEnd}
                  />
                ) : formatCycleDate(readModel.plannedEnd, timezone)}
              </span>
            </div>
            {readModel.kind === "historical" ? (
              <div className="trail-inspector__metadata-row trail-cycle-inspector__property-row">
                <span className="trail-inspector__metadata-label trail-cycle-inspector__property-label">Closed</span>
                <span className="trail-inspector__metadata-value trail-cycle-inspector__property-value">
                  {formatCycleDate(readModel.endedAt, timezone)}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {readModel.kind === "current" ? (
          <section aria-label="Cycle actions" className="trail-inspector__section trail-cycle-inspector__section trail-cycle-inspector__actions">
            <TrailButton
              disabled={pending || state.control.kind !== "ready"}
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
            disabled: pending,
            label: "Close and start next",
            onConfirm: () => setStartNextOpen(true),
            tone: "danger",
          }}
          confirmDisabled={pending}
          confirmLabel="Close"
          description={(
            <span className="trail-cycle-inspector__close-description">
              <strong>{range}</strong>
              <span>{issueRelation}</span>
              <span>
                {readModel.unfinishedIssueCount} {readModel.unfinishedIssueCount === 1 ? "issue is" : "issues are"} still open.
              </span>
              <span>Close keeps the current membership in history.</span>
              <span>Close and start next lets you choose transfers first.</span>
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
