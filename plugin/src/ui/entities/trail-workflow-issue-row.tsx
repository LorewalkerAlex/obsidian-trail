import { type ChangeEvent } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import {
  selectIsTrailEntityPending,
  selectTrailReadableMilestoneById,
  selectTrailReadableMilestoneIdsByProject,
  selectTrailReadableProjectById,
  selectTrailReadableProjectIds,
  selectTrailReadableWorkflowIssueById,
} from "../../query/shared/trail-effective-query";
import { selectTrailEntitySourceIssues } from "../../query/shared/trail-source-health-query";
import { selectTrailStatusDefinition } from "../../query/shared/trail-status-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { runTrailMutationAction } from "../interactions/trail-action";
import { useTrailWorkflowIssueStatusMutation } from "../interactions/trail-workflow-issue-status";
import { trailEstimateShortLabel } from "../patterns/trail-estimate-picker";
import { TrailStatusPicker } from "../patterns/trail-status-picker";
import type { TrailUiActions } from "../shell/trail-ui-actions";

interface TrailWorkflowIssueRowProps {
  readonly actions: TrailUiActions["issues"];
  readonly configuration: TrailConfiguration;
  readonly issueId: string;
  readonly onError: (message: string | undefined) => void;
  readonly onOpenIssue: (issueId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}

export function TrailWorkflowIssueRow({
  actions,
  configuration,
  issueId,
  onError,
  onOpenIssue,
  runtimeStore,
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
  const sourceIssues = useStore(
    runtimeStore,
    useShallow((state) => selectTrailEntitySourceIssues(state, issueId)),
  );
  const projectIds = useStore(
    runtimeStore,
    useShallow(selectTrailReadableProjectIds),
  );
  const milestoneIds = useStore(
    runtimeStore,
    useShallow((state) => issue?.projectId === undefined
      ? []
      : selectTrailReadableMilestoneIdsByProject(state, issue.projectId)),
  );
  const statusMutation = useTrailWorkflowIssueStatusMutation({
    actions,
    onError,
    runtimeStore,
    writable,
  });

  if (issue === undefined) return null;
  const status = selectTrailStatusDefinition(
    configuration,
    "issue",
    issue.statusDefinitionId,
  );
  const actionsDisabled = !writable || pending || sourceIssues.length > 0;

  const requestProject = (targetValue: string): void => {
    if (actionsDisabled) return;
    const targetProjectId = targetValue === "" ? undefined : targetValue;
    if (targetProjectId === issue.projectId) return;
    runTrailMutationAction(
      () => actions.moveToProject(issue, targetProjectId),
      { onError },
    );
  };

  const requestMilestone = (targetValue: string): void => {
    if (actionsDisabled) return;
    const targetMilestoneId = targetValue === "" ? undefined : targetValue;
    if (targetMilestoneId === issue.milestoneId) return;
    runTrailMutationAction(
      () => actions.changeMilestone(issue, targetMilestoneId),
      { onError },
    );
  };

  return (
    <li
      className="trail-workflow-issue-row"
      data-pending={pending ? "true" : undefined}
    >
      <div className="trail-workflow-issue-row__main">
        <strong>
          <button onClick={() => onOpenIssue(issue.id)} type="button">
            {issue.title}
          </button>
        </strong>
        <span>
          {status?.name ?? "Invalid status"}
          {issue.estimate !== undefined
            ? ` · Estimate ${trailEstimateShortLabel(issue.estimate)}`
            : ""}
          {sourceIssues.length > 0 ? " · data issue" : ""}
        </span>
      </div>
      <label className="trail-status-picker">
        <span className="screen-reader-text">Project for {issue.title}</span>
        <select
          disabled={actionsDisabled}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => requestProject(event.target.value)}
          value={issue.projectId ?? ""}
        >
          <option value="">No Project</option>
          {projectIds.map((projectId) => (
            <TrailWorkflowIssueProjectOption
              key={projectId}
              projectId={projectId}
              runtimeStore={runtimeStore}
            />
          ))}
        </select>
      </label>
      <label className="trail-status-picker">
        <span className="screen-reader-text">Milestone for {issue.title}</span>
        <select
          disabled={actionsDisabled || milestoneIds.length === 0}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => requestMilestone(event.target.value)}
          value={issue.milestoneId ?? ""}
        >
          <option value="">No Milestone</option>
          {milestoneIds.map((milestoneId) => (
            <TrailWorkflowIssueMilestoneOption
              key={milestoneId}
              milestoneId={milestoneId}
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
        onChange={(targetStatusDefinitionId) => {
          statusMutation.requestStatus(issue, targetStatusDefinitionId);
        }}
        value={issue.statusDefinitionId}
      />
      {statusMutation.completionDialog}
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

function TrailWorkflowIssueMilestoneOption(props: {
  readonly milestoneId: string;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const milestone = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableMilestoneById(state, props.milestoneId),
  );
  return milestone === undefined ? null : (
    <option value={milestone.id}>{milestone.title}</option>
  );
}
