import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailTriageIssue } from "../../../domain/trail-issue";
import {
  selectEffectiveProjectById,
  selectEffectiveProjectIds,
  selectEffectiveTriageIssueById,
  selectEffectiveTriageIssueIds,
  selectIsTriageIssuePending,
} from "../../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import {
  selectEntitySourceIssues,
  selectTriageSourceIssues,
  selectWorkflowRootSourceIssues,
} from "../../../query/trail-source-health";
import { formatLocalDateTimeInTimeZone } from "../../../domain/trail-temporal";
import type { TriageAcceptReceipt } from "../../../domain/trail-triage-accept";
import type { TriageCaptureReceipt } from "../../../domain/trail-triage-intake";
import type { TriageManagementReceipt } from "../../../domain/trail-triage-management";
import { runTrailAction } from "../../interactions/trail-action";
import { TrailDataIssuePanel } from "../../patterns/trail-feedback";

export interface TrailTriagePageActions {
  readonly onAccept?: (
    expectedIssue: TrailTriageIssue,
    projectId: string,
  ) => TriageAcceptReceipt;
  readonly onCapture: (title: string) => TriageCaptureReceipt;
  readonly onDefer: (expectedIssue: TrailTriageIssue) => TriageManagementReceipt;
  readonly onDelete: (expectedIssue: TrailTriageIssue) => TriageManagementReceipt;
  readonly onEdit: (
    expectedIssue: TrailTriageIssue,
    title: string,
    dueLocalValue: string,
  ) => TriageManagementReceipt;
}

export interface TrailTriagePageProps extends TrailTriagePageActions {
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
}

function formatDue(due: number, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(due));
}

export function TrailTriagePage({
  onAccept,
  onCapture,
  onDefer,
  onDelete,
  onEdit,
  runtimeStore,
  timezone,
}: TrailTriagePageProps) {
  const sourceIssues = useStore(
    runtimeStore,
    selectTriageSourceIssues,
  );
  const issueIds = useStore(
    runtimeStore,
    useShallow(selectEffectiveTriageIssueIds),
  );
  const [draft, setDraft] = useState("");
  const [captureError, setCaptureError] = useState<string>();
  const [managementError, setManagementError] = useState<string>();
  const sourceIsValid = sourceIssues.length === 0;

  const submitCapture = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!sourceIsValid || draft.trim() === "") {
      return;
    }

    runTrailAction(
      () => onCapture(draft),
      setCaptureError,
      () => setDraft(""),
    );
  };

  const runTriageAction = (
    action: () => { readonly completion: Promise<void> },
  ): boolean => runTrailAction(action, setManagementError) !== undefined;

  return (
    <main className="trail-triage">
      <section className="trail-capture" aria-labelledby="trail-capture-title">
        <div className="trail-section-heading">
          <div>
            <h2 id="trail-capture-title">Quick Capture</h2>
            <p>New captures return to you in seven calendar days by default.</p>
          </div>
        </div>

        <form className="trail-capture__form" onSubmit={submitCapture}>
          <label className="trail-capture__field">
            <span className="screen-reader-text">Capture title</span>
            <input
              autoComplete="off"
              disabled={!sourceIsValid}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setDraft(event.target.value);
              }}
              placeholder="What needs your attention?"
              value={draft}
            />
          </label>
          <button
            className="mod-cta trail-capture__button"
            disabled={!sourceIsValid || draft.trim() === ""}
            type="submit"
          >
            Capture
          </button>
        </form>

        {captureError !== undefined ? (
          <p className="trail-inline-error" role="alert">
            {captureError}
          </p>
        ) : null}
      </section>

      {sourceIssues.length > 0 ? (
        <TrailDataIssuePanel
          issues={sourceIssues.map((issue) => issue.message)}
          message="Trail is showing the last known good state and has paused Triage actions until the Markdown becomes valid again."
          title="Triage.md has a data issue."
        />
      ) : null}

      {managementError !== undefined ? (
        <p className="trail-inline-error trail-management-error" role="alert">
          {managementError}
        </p>
      ) : null}

      <section className="trail-triage-list" aria-labelledby="trail-list-title">
        <div className="trail-section-heading trail-section-heading--list">
          <div>
            <h2 id="trail-list-title">Captured</h2>
            <p>Due-first, then stable identity.</p>
          </div>
          <span className="trail-count" aria-label={`${issueIds.length} captured issues`}>
            {issueIds.length}
          </span>
        </div>

        {issueIds.length === 0 ? (
          <div className="trail-empty-state">
            <p>Nothing is waiting in Triage.</p>
            <span>Your next capture will appear here immediately.</span>
          </div>
        ) : (
          <ol className="trail-issue-list">
            {issueIds.map((issueId) => (
              <TriageIssueRow
                issueId={issueId}
                key={issueId}
                onAccept={onAccept === undefined
                  ? undefined
                  : (issue, projectId) =>
                    runTriageAction(() => onAccept(issue, projectId))}
                onDefer={(issue) => runTriageAction(() => onDefer(issue))}
                onDelete={(issue) => runTriageAction(() => onDelete(issue))}
                onEdit={(issue, title, dueLocalValue) =>
                  runTriageAction(() => onEdit(issue, title, dueLocalValue))}
                runtimeStore={runtimeStore}
                sourceIsValid={sourceIsValid}
                timezone={timezone}
              />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

interface TriageIssueRowProps {
  readonly issueId: string;
  readonly onAccept?: (issue: TrailTriageIssue, projectId: string) => boolean;
  readonly onDefer: (issue: TrailTriageIssue) => boolean;
  readonly onDelete: (issue: TrailTriageIssue) => boolean;
  readonly onEdit: (
    issue: TrailTriageIssue,
    title: string,
    dueLocalValue: string,
  ) => boolean;
  readonly runtimeStore: TrailRuntimeStore;
  readonly sourceIsValid: boolean;
  readonly timezone: string;
}

function TriageIssueRow({
  issueId,
  onAccept,
  onDefer,
  onDelete,
  onEdit,
  runtimeStore,
  sourceIsValid,
  timezone,
}: TriageIssueRowProps) {
  const issue = useStore(
    runtimeStore,
    (state) => selectEffectiveTriageIssueById(state, issueId),
  );
  const isPending = useStore(
    runtimeStore,
    (state) => selectIsTriageIssuePending(state, issueId),
  );
  const projectIds = useStore(
    runtimeStore,
    useShallow(selectEffectiveProjectIds),
  );
  const workflowRootIsValid = useStore(
    runtimeStore,
    (state) => selectWorkflowRootSourceIssues(state).length === 0,
  );
  const [acceptBaseline, setAcceptBaseline] = useState<TrailTriageIssue>();
  const [acceptProjectId, setAcceptProjectId] = useState("");
  const [editBaseline, setEditBaseline] = useState<TrailTriageIssue>();
  const [titleDraft, setTitleDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selectedProjectSourceIsValid = useStore(
    runtimeStore,
    (state) => {
      if (acceptProjectId === "") return true;
      return selectEntitySourceIssues(state, acceptProjectId).length === 0;
    },
  );

  if (issue === undefined) {
    return null;
  }

  const actionsDisabled = isPending || !sourceIsValid;
  const acceptAvailable = (
    onAccept !== undefined
    && projectIds.length > 0
    && workflowRootIsValid
  );
  const beginAccept = (): void => {
    setConfirmDelete(false);
    setEditBaseline(undefined);
    setAcceptBaseline(issue);
    const preferredProjectId = issue.projectId !== undefined
      && projectIds.includes(issue.projectId)
        ? issue.projectId
        : projectIds.length === 1
          ? projectIds[0] ?? ""
          : "";
    setAcceptProjectId(preferredProjectId);
  };
  const cancelAccept = (): void => {
    setAcceptBaseline(undefined);
    setAcceptProjectId("");
  };
  const submitAccept = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      acceptBaseline === undefined
      || onAccept === undefined
      || actionsDisabled
      || !acceptAvailable
      || acceptProjectId === ""
      || !projectIds.includes(acceptProjectId)
      || !selectedProjectSourceIsValid
    ) {
      return;
    }
    if (onAccept(acceptBaseline, acceptProjectId)) {
      cancelAccept();
    }
  };
  const beginEdit = (): void => {
    setAcceptBaseline(undefined);
    setConfirmDelete(false);
    setEditBaseline(issue);
    setTitleDraft(issue.title);
    setDueDraft(formatLocalDateTimeInTimeZone(issue.due, timezone));
  };
  const cancelEdit = (): void => {
    setEditBaseline(undefined);
  };
  const submitEdit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      editBaseline === undefined
      || actionsDisabled
      || titleDraft.trim() === ""
      || dueDraft === ""
    ) {
      return;
    }
    if (onEdit(editBaseline, titleDraft, dueDraft)) {
      setEditBaseline(undefined);
    }
  };

  return (
    <li
      className="trail-issue-row"
      data-pending={isPending ? "true" : undefined}
    >
      {editBaseline === undefined && acceptBaseline === undefined ? (
        <>
          <div className="trail-issue-row__body">
            <strong>{issue.title}</strong>
            <span>Due {formatDue(issue.due, timezone)}</span>
          </div>
          <div className="trail-issue-row__actions">
            <button
              disabled={actionsDisabled || !acceptAvailable}
              onClick={beginAccept}
              title={projectIds.length === 0 ? "Create a Project before accepting" : undefined}
              type="button"
            >
              Accept
            </button>
            <button disabled={actionsDisabled} onClick={beginEdit} type="button">
              Edit
            </button>
            <button
              disabled={actionsDisabled}
              onClick={() => {
                setConfirmDelete(false);
                onDefer(issue);
              }}
              type="button"
            >
              Defer 7 days
            </button>
            {confirmDelete ? (
              <span className="trail-delete-confirmation">
                <button
                  className="mod-warning"
                  disabled={actionsDisabled}
                  onClick={() => {
                    if (onDelete(issue)) setConfirmDelete(false);
                  }}
                  type="button"
                >
                  Confirm delete
                </button>
                <button onClick={() => setConfirmDelete(false)} type="button">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                disabled={actionsDisabled}
                onClick={() => {
                  setAcceptBaseline(undefined);
                  setConfirmDelete(true);
                }}
                type="button"
              >
                Delete
              </button>
            )}
          </div>
        </>
      ) : null}

      {acceptBaseline !== undefined ? (
        <form className="trail-issue-editor" onSubmit={submitAccept}>
          <label>
            <span>Accept into Project</span>
            <select
              disabled={actionsDisabled || !acceptAvailable}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setAcceptProjectId(event.target.value);
              }}
              value={acceptProjectId}
            >
              <option value="">Choose Project</option>
              {projectIds.map((projectId) => (
                <AcceptProjectOption
                  key={projectId}
                  projectId={projectId}
                  runtimeStore={runtimeStore}
                />
              ))}
            </select>
          </label>
          <div className="trail-issue-editor__actions">
            <button
              className="mod-cta"
              disabled={
                actionsDisabled
                || !acceptAvailable
                || acceptProjectId === ""
                || !projectIds.includes(acceptProjectId)
                || !selectedProjectSourceIsValid
              }
              type="submit"
            >
              Accept to Project
            </button>
            <button onClick={cancelAccept} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {editBaseline !== undefined ? (
        <form className="trail-issue-editor" onSubmit={submitEdit}>
          <label>
            <span>Title</span>
            <input
              autoComplete="off"
              disabled={actionsDisabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setTitleDraft(event.target.value);
              }}
              value={titleDraft}
            />
          </label>
          <label>
            <span>Due ({timezone})</span>
            <input
              disabled={actionsDisabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setDueDraft(event.target.value);
              }}
              type="datetime-local"
              value={dueDraft}
            />
          </label>
          <div className="trail-issue-editor__actions">
            <button
              className="mod-cta"
              disabled={actionsDisabled || titleDraft.trim() === "" || dueDraft === ""}
              type="submit"
            >
              Save
            </button>
            <button onClick={cancelEdit} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

interface AcceptProjectOptionProps {
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
}

function AcceptProjectOption({
  projectId,
  runtimeStore,
}: AcceptProjectOptionProps) {
  const project = useStore(
    runtimeStore,
    (state) => selectEffectiveProjectById(state, projectId),
  );
  if (project === undefined) return null;
  return <option value={project.id}>{project.title}</option>;
}
