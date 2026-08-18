import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import {
  selectIsTrailEntityPending,
  selectTrailReadableProjectById,
  selectTrailReadableProjectIds,
  selectTrailReadableWorkflowIssueById,
} from "../../query/shared/trail-effective-query";
import { selectTrailEntitySourceIssues } from "../../query/shared/trail-source-health-query";
import { selectTrailStatusDefinition } from "../../query/shared/trail-status-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { runTrailMutationAction } from "../interactions/trail-action";
import { TrailStatusPicker } from "../patterns/trail-status-picker";
import {
  TrailDialog,
  TrailDialogActions,
  TrailDialogClose,
} from "../primitives/trail-dialog";
import type { TrailUiActions } from "../shell/trail-ui-actions";

interface TrailWorkflowIssueRowProps {
  readonly actions: TrailUiActions["issues"];
  readonly configuration: TrailConfiguration;
  readonly issueId: string;
  readonly onError: (message: string | undefined) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly sourceIsHealthy: boolean;
  readonly writable: boolean;
}

export function TrailWorkflowIssueRow({
  actions,
  configuration,
  issueId,
  onError,
  runtimeStore,
  sourceIsHealthy,
  writable,
}: TrailWorkflowIssueRowProps) {
  const issue = useStore(
    runtimeStore,
    (state) => selectTrailReadableWorkflowIssueById(state, issueId),
  );
  const pending = useStore(
    runtimeStore,
    (state) => selectIsTrailEntityPending(state, issueId),
  );
  const projectIds = useStore(
    runtimeStore,
    useShallow(selectTrailReadableProjectIds),
  );
  const [completionBaseline, setCompletionBaseline] = useState<TrailWorkflowIssue>();
  const [completionTargetId, setCompletionTargetId] = useState<string>();
  const [estimateDraft, setEstimateDraft] = useState("");

  if (issue === undefined) return null;
  const status = selectTrailStatusDefinition(
    configuration,
    "issue",
    issue.statusDefinitionId,
  );
  const actionsDisabled = !writable || pending || !sourceIsHealthy;
  const completionGateOpen = completionBaseline !== undefined && completionTargetId !== undefined;

  const clearCompletionGate = (): void => {
    setCompletionBaseline(undefined);
    setCompletionTargetId(undefined);
    setEstimateDraft("");
  };

  const requestStatus = (targetStatusDefinitionId: string): void => {
    if (actionsDisabled || targetStatusDefinitionId === issue.statusDefinitionId) return;
    runTrailMutationAction(
      () => actions.changeStatus(issue, targetStatusDefinitionId),
      {
        onError,
        onNeedsInput: (request) => {
          if (request.code !== "estimate-required") {
            onError(request.message);
            return;
          }
          setCompletionBaseline(issue);
          setCompletionTargetId(targetStatusDefinitionId);
          setEstimateDraft(issue.estimate?.toString() ?? "");
        },
      },
    );
  };

  const requestProject = (targetProjectId: string): void => {
    if (
      actionsDisabled
      || targetProjectId === ""
      || targetProjectId === issue.projectId
    ) return;
    runTrailMutationAction(
      () => actions.moveToProject(issue, targetProjectId),
      { onError },
    );
  };

  const submitEstimate = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      completionBaseline === undefined
      || completionTargetId === undefined
      || estimateDraft.trim() === ""
      || actionsDisabled
    ) return;

    const estimate = Number(estimateDraft);
    runTrailMutationAction(
      () => actions.changeStatus(completionBaseline, completionTargetId, estimate),
      {
        onError,
        onNeedsInput: (request) => onError(request.message),
        onSettled: clearCompletionGate,
      },
    );
  };

  return (
    <li
      className="trail-workflow-issue-row"
      data-pending={pending ? "true" : undefined}
    >
      <div className="trail-workflow-issue-row__main">
        <strong>{issue.title}</strong>
        <span>
          {status?.name ?? "Invalid status"}
          {issue.estimate !== undefined ? ` · Estimate ${issue.estimate}` : ""}
        </span>
      </div>
      <label className="trail-status-picker">
        <span className="screen-reader-text">Project for {issue.title}</span>
        <select
          disabled={actionsDisabled || projectIds.length <= 1}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => requestProject(event.target.value)}
          value={issue.projectId ?? ""}
        >
          {projectIds.map((projectId) => (
            <TrailWorkflowIssueProjectOption
              key={projectId}
              projectId={projectId}
              runtimeStore={runtimeStore}
            />
          ))}
        </select>
      </label>
      <TrailStatusPicker
        ariaLabel={`Status for ${issue.title}`}
        configuration={configuration}
        disabled={actionsDisabled}
        entityType="issue"
        onChange={requestStatus}
        value={issue.statusDefinitionId}
      />

      <TrailDialog
        description={`Add an Estimate before moving ${issue.title} to Completed.`}
        onOpenChange={(open) => {
          if (!open) clearCompletionGate();
        }}
        open={completionGateOpen}
        title="Estimate required to complete"
      >
        <form className="trail-dialog-form" onSubmit={submitEstimate}>
          <label className="trail-dialog__field">
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
          <TrailDialogActions>
            <TrailDialogClose>
              <button type="button">Cancel</button>
            </TrailDialogClose>
            <button
              className="mod-cta"
              disabled={actionsDisabled || estimateDraft.trim() === ""}
              type="submit"
            >
              Complete
            </button>
          </TrailDialogActions>
        </form>
      </TrailDialog>
    </li>
  );
}

function TrailWorkflowIssueProjectOption(props: {
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const project = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableProjectById(state, props.projectId),
  );
  const unavailable = useStore(
    props.runtimeStore,
    (state) => selectTrailEntitySourceIssues(state, props.projectId).length > 0,
  );
  if (project === undefined) return null;
  return (
    <option disabled={unavailable} value={project.id}>
      {project.title}{unavailable ? " (data issue)" : ""}
    </option>
  );
}
