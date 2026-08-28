import { useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { selectTrailMilestoneProgress } from "../../query/derived/trail-derived-query";
import {
  selectIsTrailEntityPending,
  selectTrailReadableMilestoneById,
} from "../../query/shared/trail-effective-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { runTrailReceipt } from "../interactions/trail-action";
import { formatTrailLocalDateTime } from "../interactions/trail-local-date-time";
import { TrailMilestonePropertiesDialog } from "../patterns/trail-milestone-properties-dialog";
import {
  TrailAlertDialog,
  TrailAlertDialogAction,
  TrailAlertDialogCancel,
  TrailDialogActions,
} from "../primitives/trail-dialog";
import type { TrailUiActions } from "../shell/trail-ui-actions";

export function TrailMilestoneRow(props: {
  readonly actions: TrailUiActions["milestones"];
  readonly milestoneId: string;
  readonly onError: (message: string | undefined) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly sourceIsHealthy: boolean;
  readonly timezone: string;
  readonly writable: boolean;
}) {
  const milestone = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableMilestoneById(state, props.milestoneId),
  );
  const progress = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailMilestoneProgress(state, props.milestoneId)),
  );
  const pending = useStore(
    props.runtimeStore,
    (state) => selectIsTrailEntityPending(state, props.milestoneId),
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  if (milestone === undefined) return null;
  const actionsDisabled = !props.writable || pending || !props.sourceIsHealthy;
  const progressLabel = progress === undefined
    ? "Progress unavailable"
    : `${progress.completedIssueCount} of ${progress.effectiveIssueCount} Issues completed`;
  const dueLabel = milestone.due === undefined
    ? undefined
    : formatTrailLocalDateTime(milestone.due, props.timezone).replace("T", " ");

  return (
    <li className="trail-milestone-row" data-pending={pending ? "true" : undefined}>
      <div className="trail-workflow-issue-row__main">
        <strong>{milestone.title}</strong>
        <span>
          {progressLabel}
          {dueLabel === undefined ? "" : ` · Due ${dueLabel}`}
        </span>
      </div>
      <div className="trail-issue-row__actions">
        <button
          aria-label={`Edit ${milestone.title}`}
          disabled={actionsDisabled}
          onClick={() => setDetailsOpen(true)}
          type="button"
        >
          Edit
        </button>
        <TrailAlertDialog
          description="Linked Workflow Issues stay in their Project and are detached from this Milestone."
          title="Delete Milestone?"
          trigger={(
            <button
              aria-label={`Delete ${milestone.title}`}
              disabled={actionsDisabled}
              onClick={() => setDeleteError(undefined)}
              type="button"
            >
              Delete
            </button>
          )}
        >
          <p className="trail-dialog__detail">{milestone.title}</p>
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
                    () => props.actions.delete(milestone),
                    (message) => {
                      setDeleteError(message);
                      props.onError(message);
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
      <TrailMilestonePropertiesDialog
        actions={props.actions}
        milestoneId={milestone.id}
        onError={props.onError}
        onOpenChange={setDetailsOpen}
        open={detailsOpen}
        runtimeStore={props.runtimeStore}
        timezone={props.timezone}
        writable={props.writable && props.sourceIsHealthy}
      />
    </li>
  );
}
