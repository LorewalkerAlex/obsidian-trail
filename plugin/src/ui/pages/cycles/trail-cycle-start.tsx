import { Dialog } from "radix-ui";
import { useState } from "react";
import { useStore } from "zustand";

import {
  resolveTrailZonedDateTimeParts,
  type TrailCalendarDate,
} from "../../../domain/rules/trail-temporal-rules";
import { selectTrailCycleStartReadModel } from "../../../query/cycles/trail-cycles-page-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailDueDate } from "../../entities/trail-due";
import { TrailPriorityGlyph } from "../../entities/trail-priority";
import { TrailStatusGlyph } from "../../entities/trail-status";
import {
  formatTrailCalendarDateInput,
  parseTrailCalendarDateInput,
  TrailCalendarDatePicker,
} from "../../patterns/trail-calendar-date-picker";
import { TrailCollectionRow } from "../../patterns/trail-collection-row";
import { TrailPropertyControl } from "../../patterns/trail-property-control";
import { TrailViewPopover } from "../../patterns/trail-view-popover";
import { TrailButton } from "../../primitives/trail-button";
import { TrailCheckbox } from "../../primitives/trail-checkbox";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

type TrailCycleStartBaseProps = {
  readonly onDismiss: () => void;
  readonly onStarted: (cycleId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
};

type TrailCycleStartProps = TrailCycleStartBaseProps & (
  | {
      readonly actions: Pick<TrailUiActions["cycles"], "start">;
      readonly sourceCycleId?: undefined;
    }
  | {
      readonly actions: Pick<TrailUiActions["cycles"], "closeAndStartNext">;
      readonly sourceCycleId: string;
    }
);

function plannedEndTimestamp(date: TrailCalendarDate, timezone: string): number {
  return resolveTrailZonedDateTimeParts({
    day: date.day,
    hour: 23,
    millisecond: 999,
    minute: 59,
    month: date.month,
    second: 59,
    year: date.year,
  }, timezone);
}

function formatReferenceDate(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    year: "numeric",
  }).format(new Date(timestamp));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TrailCycleStart(props: TrailCycleStartProps) {
  const { onDismiss, onStarted, runtimeStore, sourceCycleId } = props;
  const controlKind = useStore(runtimeStore, (state) => state.control.kind);
  const [referenceNow] = useState(() => Date.now());
  const [initialModel] = useState(() => selectTrailCycleStartReadModel(
    runtimeStore.getState(),
    referenceNow,
    sourceCycleId,
  ));
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [selectedIssueIds, setSelectedIssueIds] = useState<ReadonlySet<string>>(
    () => new Set(initialModel?.initialIssueIds ?? []),
  );
  const [plannedEndDraft, setPlannedEndDraft] = useState(
    () => initialModel?.suggestedPlannedEndDate === undefined
      ? ""
      : formatTrailCalendarDateInput(initialModel.suggestedPlannedEndDate),
  );
  const [plannedEndOpen, setPlannedEndOpen] = useState(false);

  if (initialModel === null || initialModel.suggestedPlannedEndDate === undefined) return null;

  const timezone = initialModel.configuration.temporal.timezone;
  const candidateIds = new Set(initialModel.candidates.map(({ id }) => id));
  const toggleIssue = (issueId: string) => {
    if (pending) return;
    setSelectedIssueIds((current) => {
      const next = new Set(current);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  };

  const startCycle = async () => {
    if (pending || controlKind !== "ready") return;
    setFeedback(undefined);

    const latest = selectTrailCycleStartReadModel(
      runtimeStore.getState(),
      referenceNow,
      sourceCycleId,
    );
    if (latest === null || !latest.canStart) {
      setFeedback("A cycle can no longer be started from this flow.");
      return;
    }

    let plannedEnd: number;
    try {
      const plannedEndDate = parseTrailCalendarDateInput(plannedEndDraft);
      if (plannedEndDate === undefined) throw new Error("Choose a valid planned end date");
      plannedEnd = plannedEndTimestamp(plannedEndDate, timezone);
    } catch (error: unknown) {
      setFeedback(errorMessage(error));
      return;
    }

    const issueIds = initialModel.candidates
      .map(({ id }) => id)
      .filter((issueId) => candidateIds.has(issueId) && selectedIssueIds.has(issueId));

    setPending(true);
    try {
      let receipt: ReturnType<TrailUiActions["cycles"]["start"]>;
      if (props.sourceCycleId === undefined) {
        receipt = props.actions.start({ issueIds, plannedEnd });
      } else {
        if (initialModel.expectedSourceCycle === undefined) {
          throw new Error("The source cycle is no longer available for Start-next");
        }
        receipt = props.actions.closeAndStartNext(
          initialModel.expectedSourceCycle,
          { issueIds, plannedEnd },
        );
      }
      await receipt.completion;
      onStarted(receipt.entityId);
    } catch (error: unknown) {
      const label = sourceCycleId === undefined ? "Cycle start" : "Close and start next";
      setFeedback(`${label} failed: ${errorMessage(error)}`);
      setPending(false);
    }
  };

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open && !pending) onDismiss();
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className="trail-cycle-add-issues__overlay" />
        <Dialog.Content
          className="trail-cycle-add-issues__content trail-cycle-start__content"
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <header className="trail-cycle-add-issues__header">
            <Dialog.Title className="trail-cycle-add-issues__title">Start cycle</Dialog.Title>
            <Dialog.Description className="trail-cycle-add-issues__description">
              {sourceCycleId === undefined
                ? "Select issues now or start empty and add issues later."
                : "Current non-terminal issues from this cycle are preselected. Adjust them before starting the next cycle."}
            </Dialog.Description>
          </header>

          <div className="trail-cycle-add-issues__controls trail-cycle-start__fields">
            <div className="trail-cycle-start__field">
              <span className="trail-cycle-start__field-label">Starts</span>
              <span className="trail-cycle-start__field-value">
                {formatReferenceDate(referenceNow, timezone)}
              </span>
            </div>
            <div className="trail-cycle-start__field">
              <span className="trail-cycle-start__field-label">Planned end</span>
              <TrailViewPopover
                label="Planned end"
                layer="modal-child"
                onOpenChange={(nextOpen) => {
                  if (!pending) setPlannedEndOpen(nextOpen);
                }}
                open={plannedEndOpen}
                trigger={(
                  <TrailPropertyControl
                    aria-label={`Planned end: ${plannedEndDraft}`}
                    disabled={pending}
                  >
                    {plannedEndDraft}
                  </TrailPropertyControl>
                )}
                width="compact"
              >
                <div className="trail-view-popover__stack">
                  <div className="trail-view-popover__title">Planned end</div>
                  <TrailCalendarDatePicker
                    disabled={pending}
                    inputLabel="Planned end date"
                    onDateSelect={() => setPlannedEndOpen(false)}
                    onValueChange={setPlannedEndDraft}
                    referenceDate={initialModel.suggestedPlannedEndDate}
                    value={plannedEndDraft}
                  />
                </div>
              </TrailViewPopover>
            </div>
          </div>

          <div
            aria-label="Issues available for the new cycle"
            aria-multiselectable="true"
            className="trail-cycle-add-issues__candidates"
            role="listbox"
          >
            {initialModel.candidates.length === 0 ? (
              <div className="trail-cycle-add-issues__empty">No open workflow issues are available.</div>
            ) : initialModel.candidates.map((issue) => {
              const selected = selectedIssueIds.has(issue.id);
              return (
                <TrailCollectionRow
                  aria-selected={selected}
                  data-cycle-start-candidate="true"
                  key={issue.id}
                  onClick={() => toggleIssue(issue.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    toggleIssue(issue.id);
                  }}
                  role="option"
                  selected={selected}
                  selectionControl={(
                    <TrailCheckbox
                      checked={selected}
                      disabled={pending}
                      label={selected ? `Deselect ${issue.title}` : `Select ${issue.title}`}
                      onClick={() => toggleIssue(issue.id)}
                      readOnly
                    />
                  )}
                  tabIndex={0}
                >
                  <div className="trail-cycle-add-issues__candidate-content">
                    <span className="trail-cycle-add-issues__priority">
                      {issue.priority === undefined ? null : (
                        <TrailPriorityGlyph decorative priority={issue.priority} />
                      )}
                    </span>
                    <span className="trail-cycle-add-issues__candidate-title" title={issue.title}>
                      {issue.title}
                    </span>
                    <span className="trail-cycle-add-issues__project" title={issue.project.title}>
                      {issue.project.title}
                    </span>
                    <span className="trail-cycle-add-issues__status" title={issue.status.label}>
                      <TrailStatusGlyph category={issue.status.category} decorative />
                    </span>
                    <span className="trail-cycle-add-issues__due">
                      {issue.due === undefined ? null : (
                        <TrailDueDate timestamp={issue.due} timezone={timezone} />
                      )}
                    </span>
                  </div>
                </TrailCollectionRow>
              );
            })}
          </div>

          {feedback === undefined ? null : (
            <div className="trail-cycle-add-issues__feedback" role="alert">{feedback}</div>
          )}

          <footer className="trail-cycle-add-issues__footer">
            <span className="trail-cycle-add-issues__selection-count">
              {selectedIssueIds.size} selected
            </span>
            <div className="trail-cycle-add-issues__actions">
              <TrailButton disabled={pending} onClick={onDismiss}>Cancel</TrailButton>
              <TrailButton
                disabled={pending || controlKind !== "ready"}
                onClick={() => { void startCycle(); }}
                variant="primary"
              >
                {pending ? "Starting..." : "Start cycle"}
              </TrailButton>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
