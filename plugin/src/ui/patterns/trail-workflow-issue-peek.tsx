import {
  useEffect,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type {
  TrailConfiguration,
  TrailLabelGroup,
} from "../../domain/model/trail-configuration";
import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import { TRAIL_PRIORITIES, type TrailPriority } from "../../domain/model/trail-values";
import {
  selectIsTrailEntityPending,
  selectTrailReadableMilestoneById,
  selectTrailReadableProjectById,
  selectTrailReadableWorkflowIssueById,
} from "../../query/shared/trail-effective-query";
import { selectTrailEntitySourceIssues } from "../../query/shared/trail-source-health-query";
import { selectTrailStatusDefinition } from "../../query/shared/trail-status-query";
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

const PRIORITY_LABELS: Readonly<Record<TrailPriority, string>> = {
  high: "High",
  low: "Low",
  medium: "Medium",
  urgent: "Urgent",
};

function parseOptionalEstimate(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const estimate = Number(value);
  if (!Number.isSafeInteger(estimate) || estimate < 0) {
    throw new Error("Estimate must be a non-negative integer");
  }
  return estimate;
}

function applicableLabelGroups(configuration: TrailConfiguration): readonly TrailLabelGroup[] {
  return configuration.labelGroups.filter(({ registeredEntityTypes }) => (
    registeredEntityTypes.includes("issue")
  ));
}

/**
 * Current Peek carrier for lightweight Workflow Issue inspection/editing.
 * Final side-panel placement and visual treatment remain a later UI-design concern.
 */
export function TrailWorkflowIssuePeek(props: {
  readonly actions: TrailUiActions["issues"];
  readonly configuration: TrailConfiguration;
  readonly issueId?: string;
  readonly onError: (message: string | undefined) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const issue = useStore(
    props.runtimeStore,
    (state) => props.issueId === undefined
      ? undefined
      : selectTrailReadableWorkflowIssueById(state, props.issueId),
  );
  const pending = useStore(
    props.runtimeStore,
    (state) => props.issueId === undefined
      ? false
      : selectIsTrailEntityPending(state, props.issueId),
  );
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow((state) => props.issueId === undefined
      ? []
      : selectTrailEntitySourceIssues(state, props.issueId)),
  );
  const [baseline, setBaseline] = useState<TrailWorkflowIssue>();
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [priorityDraft, setPriorityDraft] = useState("");
  const [estimateDraft, setEstimateDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [labelIdsDraft, setLabelIdsDraft] = useState<readonly string[]>([]);
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    if (!props.open || props.issueId === undefined) return;
    const current = selectTrailReadableWorkflowIssueById(
      props.runtimeStore.getState(),
      props.issueId,
    );
    if (current === undefined) return;
    setBaseline(current);
    setTitleDraft(current.title);
    setDescriptionDraft(current.description ?? "");
    setPriorityDraft(current.priority ?? "");
    setEstimateDraft(current.estimate?.toString() ?? "");
    setDueDraft(current.due === undefined
      ? ""
      : formatTrailLocalDateTime(current.due, props.configuration.temporal.timezone));
    setLabelIdsDraft([...current.labelIds]);
    setLocalError(undefined);
  }, [
    props.configuration.temporal.timezone,
    props.issueId,
    props.open,
    props.runtimeStore,
  ]);

  const project = useStore(
    props.runtimeStore,
    (state) => baseline?.projectId === undefined
      ? undefined
      : selectTrailReadableProjectById(state, baseline.projectId),
  );
  const milestone = useStore(
    props.runtimeStore,
    (state) => baseline?.milestoneId === undefined
      ? undefined
      : selectTrailReadableMilestoneById(state, baseline.milestoneId),
  );
  if (!props.open || props.issueId === undefined || issue === undefined || baseline === undefined) {
    return null;
  }

  const status = selectTrailStatusDefinition(
    props.configuration,
    "issue",
    baseline.statusDefinitionId,
  );
  const completed = status?.category === "completed";
  const estimateValid = estimateDraft.trim() === ""
    ? !completed
    : Number.isSafeInteger(Number(estimateDraft)) && Number(estimateDraft) >= 0;
  const actionsDisabled = !props.writable || pending || sourceIssues.length > 0;
  const saveDisabled = actionsDisabled || titleDraft.trim() === "" || !estimateValid;
  const groups = applicableLabelGroups(props.configuration);

  const reportError = (message: string | undefined): void => {
    setLocalError(message);
    props.onError(message);
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (saveDisabled) return;
    runTrailMutationAction(
      () => props.actions.editProperties(baseline, {
        description: descriptionDraft,
        due: dueDraft === ""
          ? undefined
          : parseTrailLocalDateTime(dueDraft, props.configuration.temporal.timezone),
        estimate: parseOptionalEstimate(estimateDraft),
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
  };

  return (
    <TrailDialog
      description="Inspect and edit lightweight planning properties without leaving the current workspace."
      onOpenChange={props.onOpenChange}
      open={props.open}
      title={baseline.title}
    >
      <form className="trail-issue-editor" onSubmit={submit}>
        <p className="trail-dialog__detail">
          {status?.name ?? "Invalid status"}
          {project === undefined ? " · No project" : ` · ${project.title}`}
          {milestone === undefined ? "" : ` · ${milestone.title}`}
        </p>
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
          <span>Estimate</span>
          <input
            disabled={actionsDisabled}
            min="0"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEstimateDraft(event.target.value)}
            step="1"
            type="number"
            value={estimateDraft}
          />
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

        {groups.length === 0 ? null : (
          <fieldset disabled={actionsDisabled}>
            <legend>Labels</legend>
            {groups.map((group) => (
              <TrailWorkflowIssueLabelGroup
                configuration={props.configuration}
                group={group}
                key={group.id}
                labelIds={labelIdsDraft}
                onChange={setLabelIdsDraft}
              />
            ))}
          </fieldset>
        )}

        {localError === undefined ? null : (
          <p className="trail-inline-error" role="alert">{localError}</p>
        )}
        {completed && estimateDraft.trim() === "" ? (
          <p className="trail-inline-error">Completed issues must retain an estimate.</p>
        ) : null}

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

function TrailWorkflowIssueLabelGroup(props: {
  readonly configuration: TrailConfiguration;
  readonly group: TrailLabelGroup;
  readonly labelIds: readonly string[];
  readonly onChange: (labelIds: readonly string[]) => void;
}) {
  const labels = props.configuration.labels.filter(({ groupId }) => groupId === props.group.id);
  const groupIds = new Set(labels.map(({ id }) => id));
  if (labels.length === 0) return null;

  if (props.group.selectionMode === "single") {
    const selected = props.labelIds.find((id) => groupIds.has(id)) ?? "";
    return (
      <label>
        <span>{props.group.name}</span>
        <select
          aria-label={`${props.group.name} label`}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const outsideGroup = props.labelIds.filter((id) => !groupIds.has(id));
            props.onChange(event.target.value === ""
              ? outsideGroup
              : [...outsideGroup, event.target.value]);
          }}
          value={selected}
        >
          <option value="">None</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>{label.name}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div>
      <span>{props.group.name}</span>
      {labels.map((label) => (
        <label key={label.id}>
          <input
            checked={props.labelIds.includes(label.id)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              props.onChange(event.target.checked
                ? [...props.labelIds, label.id]
                : props.labelIds.filter((id) => id !== label.id));
            }}
            type="checkbox"
          />
          <span>{label.name}</span>
        </label>
      ))}
    </div>
  );
}
