import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailTriageIssue } from "../../domain/model/trail-entities";
import { addTrailCalendarDays } from "../../domain/rules/trail-temporal-rules";
import {
  selectIsTrailEntityPending,
  selectTrailReadableProjectById,
  selectTrailReadableProjectIds,
  selectTrailReadableTriageIssueById,
} from "../../query/shared/trail-effective-query";
import { selectTrailEntitySourceIssues } from "../../query/shared/trail-source-health-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import {
  runTrailMutationAction,
  runTrailReceipt,
} from "../interactions/trail-action";
import {
  formatTrailLocalDateTime,
  parseTrailLocalDateTime,
} from "../interactions/trail-local-date-time";
import {
  TrailAlertDialog,
  TrailAlertDialogAction,
  TrailAlertDialogCancel,
  TrailDialogActions,
} from "../primitives/trail-dialog";
import type { TrailUiActions } from "../shell/trail-ui-actions";

interface TrailTriageIssueRowProps {
  readonly actions: TrailUiActions["triage"];
  readonly issueId: string;
  readonly onError: (message: string | undefined) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly sourceIsHealthy: boolean;
  readonly timezone: string;
  readonly writable: boolean;
}

function formatDue(due: number, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(due));
}

export function TrailTriageIssueRow({
  actions,
  issueId,
  onError,
  runtimeStore,
  sourceIsHealthy,
  timezone,
  writable,
}: TrailTriageIssueRowProps) {
  const issue = useStore(
    runtimeStore,
    (state) => selectTrailReadableTriageIssueById(state, issueId),
  );
  const pending = useStore(
    runtimeStore,
    (state) => selectIsTrailEntityPending(state, issueId),
  );
  const projectIds = useStore(
    runtimeStore,
    useShallow(selectTrailReadableProjectIds),
  );
  const [acceptBaseline, setAcceptBaseline] = useState<TrailTriageIssue>();
  const [acceptProjectId, setAcceptProjectId] = useState("");
  const [editBaseline, setEditBaseline] = useState<TrailTriageIssue>();
  const [titleDraft, setTitleDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [deleteError, setDeleteError] = useState<string>();
  const targetHasIssues = useStore(
    runtimeStore,
    (state) => acceptProjectId !== ""
      && selectTrailEntitySourceIssues(state, acceptProjectId).length > 0,
  );

  if (issue === undefined) return null;

  const actionsDisabled = !writable || pending || !sourceIsHealthy;
  const acceptAvailable = projectIds.length > 0;

  const cancelAccept = (): void => {
    setAcceptBaseline(undefined);
    setAcceptProjectId("");
  };

  const beginAccept = (): void => {
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

  const submitAccept = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      acceptBaseline === undefined
      || actionsDisabled
      || acceptProjectId === ""
      || !projectIds.includes(acceptProjectId)
      || targetHasIssues
    ) return;

    const receipt = runTrailReceipt(
      () => actions.accept(acceptBaseline, acceptProjectId),
      onError,
    );
    if (receipt !== undefined) cancelAccept();
  };

  const beginEdit = (): void => {
    setAcceptBaseline(undefined);
    setEditBaseline(issue);
    setTitleDraft(issue.title);
    setDueDraft(formatTrailLocalDateTime(issue.due, timezone));
  };

  const submitEdit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      editBaseline === undefined
      || actionsDisabled
      || titleDraft.trim() === ""
      || dueDraft === ""
    ) return;

    try {
      const originalLocal = formatTrailLocalDateTime(editBaseline.due, timezone);
      const due = dueDraft === originalLocal
        ? editBaseline.due
        : parseTrailLocalDateTime(dueDraft, timezone);
      runTrailMutationAction(
        () => actions.edit(editBaseline, { due, title: titleDraft }),
        {
          onError,
          onNeedsInput: (request) => onError(request.message),
          onSettled: () => setEditBaseline(undefined),
        },
      );
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : "Unable to parse Triage Due");
    }
  };

  const deferIssue = (): void => {
    if (actionsDisabled) return;
    runTrailReceipt(
      () => actions.defer(
        issue,
        addTrailCalendarDays(issue.due, timezone, 7),
      ),
      onError,
    );
  };

  const convertToProject = (): void => {
    if (actionsDisabled) return;
    runTrailReceipt(
      () => actions.convertToProject(issue),
      onError,
    );
  };

  return (
    <li
      className="trail-issue-row"
      data-pending={pending ? "true" : undefined}
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
            <button disabled={actionsDisabled} onClick={convertToProject} type="button">
              Convert to project
            </button>
            <button disabled={actionsDisabled} onClick={beginEdit} type="button">
              Edit
            </button>
            <button disabled={actionsDisabled} onClick={deferIssue} type="button">
              Defer 7 days
            </button>
            <TrailAlertDialog
              description="This removes the captured item from Triage."
              title="Delete Triage Issue?"
              trigger={(
                <button
                  disabled={actionsDisabled}
                  onClick={() => setDeleteError(undefined)}
                  type="button"
                >
                  Delete
                </button>
              )}
            >
              <p className="trail-dialog__detail">{issue.title}</p>
              {deleteError === undefined ? null : (
                <p className="trail-inline-error" role="alert">{deleteError}</p>
              )}
              <TrailDialogActions>
                <TrailAlertDialogCancel>
                  <button type="button">Cancel</button>
                </TrailAlertDialogCancel>
                <TrailAlertDialogAction>
                  <button
                    className="mod-warning"
                    disabled={actionsDisabled}
                    onClick={(event) => {
                      const receipt = runTrailReceipt(
                        () => actions.delete(issue),
                        (message) => {
                          setDeleteError(message);
                          onError(message);
                        },
                      );
                      if (receipt === undefined) event.preventDefault();
                    }}
                    type="button"
                  >
                    Confirm delete
                  </button>
                </TrailAlertDialogAction>
              </TrailDialogActions>
            </TrailAlertDialog>
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
                <TrailAcceptProjectOption
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
                || acceptProjectId === ""
                || !projectIds.includes(acceptProjectId)
                || targetHasIssues
              }
              type="submit"
            >
              Accept to Project
            </button>
            <button onClick={cancelAccept} type="button">Cancel</button>
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
              onChange={(event: ChangeEvent<HTMLInputElement>) => setTitleDraft(event.target.value)}
              value={titleDraft}
            />
          </label>
          <label>
            <span>Due ({timezone})</span>
            <input
              disabled={actionsDisabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDueDraft(event.target.value)}
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
            <button onClick={() => setEditBaseline(undefined)} type="button">Cancel</button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

function TrailAcceptProjectOption(props: {
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const project = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableProjectById(state, props.projectId),
  );
  return project === undefined ? null : <option value={project.id}>{project.title}</option>;
}
