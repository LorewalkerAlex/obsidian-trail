import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import {
  selectIsTrailEntityPending,
  selectTrailReadableMilestoneById,
  selectTrailReadableProjectById,
  selectTrailReadableWorkflowIssueById,
} from "../../query/shared/trail-effective-query";
import { selectTrailEntitySourceIssues } from "../../query/shared/trail-source-health-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import {
  createTrailWorkflowIssueDragData,
} from "../interactions/trail-workflow-board-dnd";
import { TrailStatusPicker } from "../patterns/trail-status-picker";

export function TrailWorkflowIssueCard(props: {
  readonly configuration: TrailConfiguration;
  readonly instanceId: symbol;
  readonly issueId: string;
  readonly onRequestStatus: (issue: TrailWorkflowIssue, targetStatusDefinitionId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly showProject: boolean;
  readonly writable: boolean;
}) {
  const issue = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableWorkflowIssueById(state, props.issueId),
  );
  const pending = useStore(
    props.runtimeStore,
    (state) => selectIsTrailEntityPending(state, props.issueId),
  );
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailEntitySourceIssues(state, props.issueId)),
  );
  const project = useStore(
    props.runtimeStore,
    (state) => issue?.projectId === undefined
      ? undefined
      : selectTrailReadableProjectById(state, issue.projectId),
  );
  const milestone = useStore(
    props.runtimeStore,
    (state) => issue?.milestoneId === undefined
      ? undefined
      : selectTrailReadableMilestoneById(state, issue.milestoneId),
  );
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [dragHandle, setDragHandle] = useState<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const actionsDisabled = issue === undefined
    || !props.writable
    || pending
    || sourceIssues.length > 0;

  useEffect(() => {
    if (element === null || dragHandle === null || issue === undefined) return undefined;
    return draggable({
      canDrag: () => !actionsDisabled,
      dragHandle,
      element,
      getInitialData: () => createTrailWorkflowIssueDragData({
        instanceId: props.instanceId,
        issueId: issue.id,
        projectId: issue.projectId,
        sourceStatusDefinitionId: issue.statusDefinitionId,
      }),
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    });
  }, [
    actionsDisabled,
    dragHandle,
    element,
    issue,
    props.instanceId,
  ]);

  if (issue === undefined) return null;

  return (
    <article
      aria-label={issue.title}
      className="trail-workflow-issue-card"
      data-dragging={dragging ? "true" : undefined}
      data-pending={pending ? "true" : undefined}
      ref={setElement}
    >
      <div className="trail-workflow-issue-card__heading">
        <strong>{issue.title}</strong>
        <span
          aria-hidden="true"
          className="trail-workflow-issue-card__drag-handle"
          ref={setDragHandle}
          title="Drag to change Status"
        >
          ⠿
        </span>
      </div>
      <div className="trail-workflow-issue-card__meta">
        {props.showProject ? <span>{project?.title ?? "No Project"}</span> : null}
        {milestone !== undefined ? <span>{milestone.title}</span> : null}
        {issue.estimate !== undefined ? <span>Estimate {issue.estimate}</span> : null}
        {sourceIssues.length > 0 ? <span>Data issue</span> : null}
      </div>
      <TrailStatusPicker
        ariaLabel={`Status for ${issue.title}`}
        configuration={props.configuration}
        disabled={actionsDisabled}
        entityType="issue"
        onChange={(targetStatusDefinitionId) => {
          props.onRequestStatus(issue, targetStatusDefinitionId);
        }}
        value={issue.statusDefinitionId}
      />
    </article>
  );
}
