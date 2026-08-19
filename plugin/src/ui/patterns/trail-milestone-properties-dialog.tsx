import {
  useEffect,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailMilestone } from "../../domain/model/trail-entities";
import {
  selectIsTrailEntityPending,
  selectTrailReadableMilestoneById,
} from "../../query/shared/trail-effective-query";
import { selectTrailEntitySourceIssues } from "../../query/shared/trail-source-health-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { runTrailMutationAction } from "../interactions/trail-action";
import {
  formatTrailLocalDateTime,
  parseTrailLocalDateTime,
} from "../interactions/trail-local-date-time";
import {
  TrailDialog,
  TrailDialogActions,
  TrailDialogClose,
} from "../primitives/trail-dialog";
import type { TrailUiActions } from "../shell/trail-ui-actions";

/** Edits only Milestone-owned details; Project ownership remains structural and unchanged. */
export function TrailMilestonePropertiesDialog(props: {
  readonly actions: TrailUiActions["milestones"];
  readonly milestoneId?: string;
  readonly onError: (message: string | undefined) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
  readonly writable: boolean;
}) {
  const milestone = useStore(
    props.runtimeStore,
    (state) => props.milestoneId === undefined
      ? undefined
      : selectTrailReadableMilestoneById(state, props.milestoneId),
  );
  const pending = useStore(
    props.runtimeStore,
    (state) => props.milestoneId === undefined
      ? false
      : selectIsTrailEntityPending(state, props.milestoneId),
  );
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow((state) => props.milestoneId === undefined
      ? []
      : selectTrailEntitySourceIssues(state, props.milestoneId)),
  );
  const [baseline, setBaseline] = useState<TrailMilestone>();
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    if (!props.open || props.milestoneId === undefined) return;
    const current = selectTrailReadableMilestoneById(
      props.runtimeStore.getState(),
      props.milestoneId,
    );
    if (current === undefined) return;
    setBaseline(current);
    setTitleDraft(current.title);
    setDescriptionDraft(current.description ?? "");
    setDueDraft(current.due === undefined
      ? ""
      : formatTrailLocalDateTime(current.due, props.timezone));
    setLocalError(undefined);
  }, [props.milestoneId, props.open, props.runtimeStore, props.timezone]);

  if (!props.open || props.milestoneId === undefined || milestone === undefined || baseline === undefined) {
    return null;
  }

  const actionsDisabled = !props.writable || pending || sourceIssues.length > 0;
  const saveDisabled = actionsDisabled || titleDraft.trim() === "";

  const reportError = (message: string | undefined): void => {
    setLocalError(message);
    props.onError(message);
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (saveDisabled) return;
    try {
      runTrailMutationAction(
        () => props.actions.editProperties(baseline, {
          description: descriptionDraft,
          due: dueDraft === ""
            ? undefined
            : parseTrailLocalDateTime(dueDraft, props.timezone),
          title: titleDraft,
        }),
        {
          onError: reportError,
          onNeedsInput: (request) => reportError(request.message),
          onSettled: () => props.onOpenChange(false),
        },
      );
    } catch (error: unknown) {
      reportError(error instanceof Error ? error.message : "Unable to parse Milestone Due");
    }
  };

  return (
    <TrailDialog
      description="Edit Milestone details. Project ownership remains unchanged."
      onOpenChange={props.onOpenChange}
      open={props.open}
      title={baseline.title}
    >
      <form className="trail-issue-editor" onSubmit={submit}>
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
          <span>Description</span>
          <textarea
            disabled={actionsDisabled}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              setDescriptionDraft(event.target.value);
            }}
            rows={5}
            value={descriptionDraft}
          />
        </label>
        <label>
          <span>Due ({props.timezone})</span>
          <input
            disabled={actionsDisabled}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDueDraft(event.target.value)}
            type="datetime-local"
            value={dueDraft}
          />
        </label>

        {localError === undefined ? null : (
          <p className="trail-inline-error" role="alert">{localError}</p>
        )}

        <TrailDialogActions>
          <button className="mod-cta" disabled={saveDisabled} type="submit">Save</button>
          <TrailDialogClose>
            <button type="button">Close</button>
          </TrailDialogClose>
        </TrailDialogActions>
      </form>
    </TrailDialog>
  );
}
