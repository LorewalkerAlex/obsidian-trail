import {
  useEffect,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailInitiative } from "../../domain/model/trail-entities";
import { TRAIL_PRIORITIES, type TrailPriority } from "../../domain/model/trail-values";
import {
  selectIsTrailEntityPending,
  selectTrailReadableInitiativeById,
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
import { TrailLabelEditor } from "./trail-label-editor";

const PRIORITY_LABELS: Readonly<Record<TrailPriority, string>> = {
  high: "High",
  low: "Low",
  medium: "Medium",
  urgent: "Urgent",
};

/** Edits only Initiative-owned lightweight facts. */
export function TrailInitiativePropertiesDialog(props: {
  readonly actions: TrailUiActions["initiatives"];
  readonly configuration: TrailConfiguration;
  readonly initiativeId?: string;
  readonly onError: (message: string | undefined) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const initiative = useStore(
    props.runtimeStore,
    (state) => props.initiativeId === undefined
      ? undefined
      : selectTrailReadableInitiativeById(state, props.initiativeId),
  );
  const pending = useStore(
    props.runtimeStore,
    (state) => props.initiativeId === undefined
      ? false
      : selectIsTrailEntityPending(state, props.initiativeId),
  );
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow((state) => props.initiativeId === undefined
      ? []
      : selectTrailEntitySourceIssues(state, props.initiativeId)),
  );
  const [baseline, setBaseline] = useState<TrailInitiative>();
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [priorityDraft, setPriorityDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [labelIdsDraft, setLabelIdsDraft] = useState<readonly string[]>([]);
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    if (!props.open || props.initiativeId === undefined) return;
    const current = selectTrailReadableInitiativeById(
      props.runtimeStore.getState(),
      props.initiativeId,
    );
    if (current === undefined) return;
    setBaseline(current);
    setTitleDraft(current.title);
    setDescriptionDraft(current.description ?? "");
    setPriorityDraft(current.priority ?? "");
    setDueDraft(current.due === undefined
      ? ""
      : formatTrailLocalDateTime(current.due, props.configuration.temporal.timezone));
    setLabelIdsDraft([...current.labelIds]);
    setLocalError(undefined);
  }, [
    props.configuration.temporal.timezone,
    props.initiativeId,
    props.open,
    props.runtimeStore,
  ]);

  if (
    !props.open
    || props.initiativeId === undefined
    || initiative === undefined
    || baseline === undefined
  ) {
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
            : parseTrailLocalDateTime(dueDraft, props.configuration.temporal.timezone),
          labelIds: labelIdsDraft,
          priority: priorityDraft === "" ? undefined : priorityDraft as TrailPriority,
          title: titleDraft,
        }),
        {
          onError: reportError,
          onNeedsInput: (request) => reportError(request.message),
          onSettled: () => props.onOpenChange(false),
        },
      );
    } catch (error: unknown) {
      reportError(error instanceof Error ? error.message : "Unable to parse Initiative Due");
    }
  };

  return (
    <TrailDialog
      description="Edit Initiative details."
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
          <span>Priority</span>
          <select
            disabled={actionsDisabled}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setPriorityDraft(event.target.value)}
            value={priorityDraft}
          >
            <option value="">No priority</option>
            {TRAIL_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Due ({props.configuration.temporal.timezone})</span>
          <input
            disabled={actionsDisabled}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDueDraft(event.target.value)}
            type="datetime-local"
            value={dueDraft}
          />
        </label>

        <TrailLabelEditor
          configuration={props.configuration}
          disabled={actionsDisabled}
          entityType="initiative"
          labelIds={labelIdsDraft}
          onChange={setLabelIdsDraft}
        />

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
