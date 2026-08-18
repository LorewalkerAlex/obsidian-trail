import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailConfiguration } from "../../../domain/model/trail-configuration";
import type { TrailCycle } from "../../../domain/model/trail-entities";
import { resolveTrailCycleDefaultEndDate } from "../../../domain/rules/trail-temporal-rules";
import {
  selectTrailCycleHistoryIds,
  selectTrailCyclePlanningIssueIds,
  selectTrailCycleRolloverIssueIds,
  selectTrailReadableCycleById,
} from "../../../query/cycles/trail-cycle-query";
import {
  selectIsTrailEntityPending,
  selectTrailReadableCurrentCycleId,
  selectTrailReadableProjectById,
  selectTrailReadableWorkflowIssueById,
} from "../../../query/shared/trail-effective-query";
import { selectTrailEntitySourceIssues } from "../../../query/shared/trail-source-health-query";
import { selectTrailStatusDefinition } from "../../../query/shared/trail-status-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import {
  formatTrailLocalDateTime,
  parseTrailLocalDateTime,
} from "../../interactions/trail-local-date-time";
import {
  runTrailMutationAction,
  runTrailReceipt,
} from "../../interactions/trail-action";
import { TrailDataIssuePanel } from "../../patterns/trail-feedback";
import { TrailWorkflowPresentation } from "../../patterns/trail-workflow-presentation";
import {
  TrailAlertDialog,
  TrailAlertDialogAction,
  TrailAlertDialogCancel,
  TrailDialogActions,
} from "../../primitives/trail-dialog";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Cycle default rule resolves a calendar date; the UI confirms it as local end-of-day. */
function suggestedCycleEndDraft(configuration: TrailConfiguration, effectiveAt: number): string {
  const date = resolveTrailCycleDefaultEndDate(
    effectiveAt,
    configuration.temporal.timezone,
    configuration.cycle.defaultEndRule,
  );
  return [
    date.year.toString().padStart(4, "0"),
    "-",
    padTwo(date.month),
    "-",
    padTwo(date.day),
    "T23:59",
  ].join("");
}

export function TrailCyclesPage(props: {
  readonly actions: TrailUiActions["cycles"];
  readonly configuration: TrailConfiguration;
  readonly issueActions: TrailUiActions["issues"];
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const currentCycleId = useStore(
    props.runtimeStore,
    selectTrailReadableCurrentCycleId,
  );
  const currentCycle = useStore(
    props.runtimeStore,
    (state) => currentCycleId === undefined
      ? undefined
      : selectTrailReadableCycleById(state, currentCycleId),
  );
  const historyIds = useStore(
    props.runtimeStore,
    useShallow(selectTrailCycleHistoryIds),
  );
  const planningIssueIds = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailCyclePlanningIssueIds(state, currentCycleId)),
  );
  const sourceProbeCycleId = currentCycleId ?? historyIds[0];
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow((state) => sourceProbeCycleId === undefined
      ? []
      : selectTrailEntitySourceIssues(state, sourceProbeCycleId)),
  );
  const pending = useStore(
    props.runtimeStore,
    (state) => currentCycleId !== undefined
      && selectIsTrailEntityPending(state, currentCycleId),
  );
  const [openIssueIds, setOpenIssueIds] = useState<ReadonlySet<string>>(new Set());
  const [plannedEndDraft, setPlannedEndDraft] = useState(() => (
    suggestedCycleEndDraft(props.configuration, Date.now())
  ));
  const [rolloverFromCycleId, setRolloverFromCycleId] = useState<string>();
  const [workflowError, setWorkflowError] = useState<string>();
  const actionsDisabled = !props.writable || sourceIssues.length > 0 || pending;

  const toggleOpenCandidate = (issueId: string, selected: boolean): void => {
    setOpenIssueIds((current) => {
      const next = new Set(current);
      if (selected) next.add(issueId);
      else next.delete(issueId);
      return next;
    });
  };

  const submitOpenCycle = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (actionsDisabled || plannedEndDraft === "") return;
    let plannedEnd: number;
    try {
      plannedEnd = parseTrailLocalDateTime(
        plannedEndDraft,
        props.configuration.temporal.timezone,
      );
    } catch (error: unknown) {
      setWorkflowError(error instanceof Error ? error.message : "Invalid Cycle planned end");
      return;
    }
    const issueIds = planningIssueIds.filter((issueId) => openIssueIds.has(issueId));
    runTrailReceipt(
      () => props.actions.open({ issueIds, plannedEnd }),
      setWorkflowError,
      () => {
        setOpenIssueIds(new Set());
        setRolloverFromCycleId(undefined);
        setPlannedEndDraft(suggestedCycleEndDraft(props.configuration, Date.now()));
      },
    );
  };

  const requestMembership = (cycle: TrailCycle, issueId: string, selected: boolean): void => {
    if (actionsDisabled) return;
    const next = new Set(cycle.issueIds);
    if (selected) next.add(issueId);
    else next.delete(issueId);
    runTrailMutationAction(
      () => props.actions.changeMembership(cycle, [...next]),
      { onError: setWorkflowError },
    );
  };

  const closeCurrentCycle = (cycle: TrailCycle): boolean => {
    if (actionsDisabled) return false;
    const rolloverIssueIds = selectTrailCycleRolloverIssueIds(
      props.runtimeStore.getState(),
      cycle.id,
    );
    return runTrailReceipt(
      () => props.actions.close(cycle),
      setWorkflowError,
      () => {
        setOpenIssueIds(new Set(rolloverIssueIds));
        setRolloverFromCycleId(cycle.id);
        setPlannedEndDraft(suggestedCycleEndDraft(props.configuration, Date.now()));
      },
    ) !== undefined;
  };

  const cancelRollover = (): void => {
    setRolloverFromCycleId(undefined);
    setOpenIssueIds(new Set());
    setPlannedEndDraft(suggestedCycleEndDraft(props.configuration, Date.now()));
  };

  return (
    <main className="trail-projects">
      {workflowError === undefined ? null : (
        <p className="trail-inline-error trail-management-error" role="alert">
          {workflowError}
        </p>
      )}

      {sourceIssues.length === 0 ? null : (
        <TrailDataIssuePanel
          issues={sourceIssues.map((issue) => issue.message)}
          message="Trail keeps the last known good Cycle data visible but pauses Cycle changes until its Markdown source is valid again."
          title="Cycle data needs attention."
        />
      )}

      {currentCycle === undefined ? (
        <section className="trail-project-workspace" aria-labelledby="trail-cycle-open-title">
          <div className="trail-section-heading">
            <div>
              <h2 id="trail-cycle-open-title">
                {rolloverFromCycleId === undefined ? "Open Cycle" : "Open next Cycle"}
              </h2>
              <p>
                {rolloverFromCycleId === undefined
                  ? "Choose the Workflow Issues you intend to focus on during this planning period."
                  : "Unfinished work from the closed Cycle is selected by default; remove anything you do not want to carry forward."}
              </p>
            </div>
            <span className="trail-count" aria-label={`${openIssueIds.size} selected issues`}>
              {openIssueIds.size}
            </span>
          </div>

          <form className="trail-issue-editor" onSubmit={submitOpenCycle}>
            <label className="trail-issue-editor__field">
              <span>Planned end ({props.configuration.temporal.timezone})</span>
              <input
                aria-label="Cycle planned end"
                disabled={actionsDisabled}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setPlannedEndDraft(event.target.value)}
                type="datetime-local"
                value={plannedEndDraft}
              />
            </label>
            <div className="trail-issue-editor__actions">
              <button
                className="mod-cta"
                disabled={actionsDisabled || plannedEndDraft === ""}
                type="submit"
              >
                {rolloverFromCycleId === undefined ? "Open Cycle" : "Open next Cycle"}
              </button>
              {rolloverFromCycleId === undefined ? null : (
                <button disabled={actionsDisabled} onClick={cancelRollover} type="button">
                  Cancel next Cycle
                </button>
              )}
            </div>
          </form>

          <TrailCycleIssueSelectionList
            configuration={props.configuration}
            disabled={actionsDisabled}
            issueIds={planningIssueIds}
            onToggle={toggleOpenCandidate}
            runtimeStore={props.runtimeStore}
            selectedIssueIds={openIssueIds}
          />
        </section>
      ) : (
        <>
          <section className="trail-project-workspace" aria-labelledby="trail-cycle-current-title">
            <div className="trail-project-workspace__header">
              <div>
                <p className="trail-app__eyebrow">Current Cycle</p>
                <h2 id="trail-cycle-current-title">
                  {formatTrailLocalDateTime(
                    currentCycle.startedAt,
                    props.configuration.temporal.timezone,
                  )}
                  {" -> "}
                  {formatTrailLocalDateTime(
                    currentCycle.plannedEnd,
                    props.configuration.temporal.timezone,
                  )}
                </h2>
                <span>{currentCycle.issueIds.length} planned Issues</span>
              </div>
              {pending ? <span className="trail-pending-chip">Saving</span> : null}
            </div>

            <div className="trail-section-heading trail-section-heading--list">
              <div>
                <h3>Membership</h3>
                <p>Cycle membership is explicit and does not change Issue Status.</p>
              </div>
            </div>

            <TrailCycleIssueSelectionList
              configuration={props.configuration}
              disabled={actionsDisabled}
              issueIds={planningIssueIds}
              onToggle={(issueId, selected) => requestMembership(currentCycle, issueId, selected)}
              runtimeStore={props.runtimeStore}
              selectedIssueIds={new Set(currentCycle.issueIds)}
            />

            <TrailAlertDialog
              description="Closing freezes this Cycle's final membership. Unfinished members become preselected candidates for an optional next Cycle."
              title="Close current Cycle?"
              trigger={(
                <button disabled={actionsDisabled} type="button">
                  Close Cycle
                </button>
              )}
            >
              <p className="trail-dialog__detail">
                Trail will not change the Status, Project, Milestone, or other facts of any Issue.
              </p>
              <TrailDialogActions>
                <TrailAlertDialogCancel>
                  <button type="button">Cancel</button>
                </TrailAlertDialogCancel>
                <TrailAlertDialogAction>
                  <button
                    className="mod-warning"
                    disabled={actionsDisabled}
                    onClick={(event) => {
                      if (!closeCurrentCycle(currentCycle)) event.preventDefault();
                    }}
                    type="button"
                  >
                    Confirm close
                  </button>
                </TrailAlertDialogAction>
              </TrailDialogActions>
            </TrailAlertDialog>
          </section>

          <section className="trail-project-workspace" aria-labelledby="trail-cycle-execution-title">
            <div className="trail-section-heading trail-section-heading--list">
              <div>
                <h2 id="trail-cycle-execution-title">Execution</h2>
                <p>Use List for explicit properties or Board for Status execution with Project swimlanes.</p>
              </div>
              <span className="trail-count" aria-label={`${currentCycle.issueIds.length} cycle issues`}>
                {currentCycle.issueIds.length}
              </span>
            </div>
            {currentCycle.issueIds.length === 0 ? (
              <div className="trail-empty-state trail-empty-state--compact">
                <p>No Issues in the Current Cycle.</p>
                <span>Add work through Membership when priorities change.</span>
              </div>
            ) : (
              <TrailWorkflowPresentation
                actions={props.issueActions}
                configuration={props.configuration}
                issueIds={currentCycle.issueIds}
                laneMode="project"
                onError={setWorkflowError}
                runtimeStore={props.runtimeStore}
                writable={props.writable}
              />
            )}
          </section>
        </>
      )}

      <TrailCycleHistory
        cycleIds={historyIds}
        runtimeStore={props.runtimeStore}
        timezone={props.configuration.temporal.timezone}
      />
    </main>
  );
}

function TrailCycleIssueSelectionList(props: {
  readonly configuration: TrailConfiguration;
  readonly disabled: boolean;
  readonly issueIds: readonly string[];
  readonly onToggle: (issueId: string, selected: boolean) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly selectedIssueIds: ReadonlySet<string>;
}) {
  if (props.issueIds.length === 0) {
    return (
      <div className="trail-empty-state trail-empty-state--compact">
        <p>No eligible Workflow Issues.</p>
        <span>You can still open an empty Cycle and add work later.</span>
      </div>
    );
  }
  return (
    <ol className="trail-workflow-issue-list" aria-label="Cycle planning Issues">
      {props.issueIds.map((issueId) => (
        <TrailCycleIssueSelectionRow
          configuration={props.configuration}
          disabled={props.disabled}
          issueId={issueId}
          key={issueId}
          onToggle={props.onToggle}
          runtimeStore={props.runtimeStore}
          selected={props.selectedIssueIds.has(issueId)}
        />
      ))}
    </ol>
  );
}

function TrailCycleIssueSelectionRow(props: {
  readonly configuration: TrailConfiguration;
  readonly disabled: boolean;
  readonly issueId: string;
  readonly onToggle: (issueId: string, selected: boolean) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly selected: boolean;
}) {
  const issue = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableWorkflowIssueById(state, props.issueId),
  );
  const project = useStore(
    props.runtimeStore,
    (state) => issue?.projectId === undefined
      ? undefined
      : selectTrailReadableProjectById(state, issue.projectId),
  );
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailEntitySourceIssues(state, props.issueId)),
  );
  if (issue === undefined) return null;
  const status = selectTrailStatusDefinition(
    props.configuration,
    "issue",
    issue.statusDefinitionId,
  );
  const disabled = props.disabled || sourceIssues.length > 0;
  return (
    <li className="trail-workflow-issue-row">
      <div className="trail-workflow-issue-row__main">
        <strong>{issue.title}</strong>
        <span>
          {project?.title ?? "No Project"}
          {" · "}
          {status?.name ?? "Invalid status"}
          {sourceIssues.length > 0 ? " · data issue" : ""}
        </span>
      </div>
      <label className="trail-status-picker">
        <span className="screen-reader-text">Include {issue.title}</span>
        <input
          aria-label={`Include ${issue.title}`}
          checked={props.selected}
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            props.onToggle(issue.id, event.target.checked);
          }}
          type="checkbox"
        />
      </label>
    </li>
  );
}

function TrailCycleHistory(props: {
  readonly cycleIds: readonly string[];
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
}) {
  return (
    <section className="trail-project-workspace" aria-labelledby="trail-cycle-history-title">
      <div className="trail-section-heading trail-section-heading--list">
        <div>
          <h2 id="trail-cycle-history-title">Cycle history</h2>
          <p>Closed Cycles retain their final membership as lightweight planning history.</p>
        </div>
        <span className="trail-count" aria-label={`${props.cycleIds.length} closed cycles`}>
          {props.cycleIds.length}
        </span>
      </div>
      {props.cycleIds.length === 0 ? (
        <div className="trail-empty-state trail-empty-state--compact">
          <p>No closed Cycles yet.</p>
          <span>Closing a Cycle will add it here.</span>
        </div>
      ) : (
        <ol className="trail-workflow-issue-list">
          {props.cycleIds.map((cycleId) => (
            <TrailCycleHistoryRow
              cycleId={cycleId}
              key={cycleId}
              runtimeStore={props.runtimeStore}
              timezone={props.timezone}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function TrailCycleHistoryRow(props: {
  readonly cycleId: string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
}) {
  const cycle = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableCycleById(state, props.cycleId),
  );
  if (cycle === undefined || cycle.endedAt === undefined) return null;
  return (
    <li className="trail-workflow-issue-row">
      <div className="trail-workflow-issue-row__main">
        <strong>
          {formatTrailLocalDateTime(cycle.startedAt, props.timezone)}
          {" -> "}
          {formatTrailLocalDateTime(cycle.endedAt, props.timezone)}
        </strong>
        <span>
          Planned end {formatTrailLocalDateTime(cycle.plannedEnd, props.timezone)}
          {" · "}
          {cycle.issueIds.length} final Issues
        </span>
      </div>
    </li>
  );
}
