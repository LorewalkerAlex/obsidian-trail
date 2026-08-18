import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type {
  TrailConfiguration,
  TrailStatusDefinition,
} from "../../domain/model/trail-configuration";
import type {
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  selectTrailReadableProjectById,
  selectTrailReadableWorkflowIssueById,
} from "../../query/shared/trail-effective-query";
import { selectTrailStatusOptionGroups } from "../../query/shared/trail-status-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailWorkflowIssueCard } from "../entities/trail-workflow-issue-card";
import { TrailWorkflowIssueRow } from "../entities/trail-workflow-issue-row";
import {
  createTrailWorkflowStatusDropData,
  resolveTrailWorkflowStatusDrop,
} from "../interactions/trail-workflow-board-dnd";
import { useTrailWorkflowIssueStatusMutation } from "../interactions/trail-workflow-issue-status";
import type { TrailUiActions } from "../shell/trail-ui-actions";

type TrailWorkflowPresentationMode = "board" | "list";
type TrailWorkflowLaneMode = "project" | "single";

interface TrailWorkflowLane {
  readonly key: string;
  readonly label: string;
  readonly projectId?: string;
  readonly issueIds: readonly string[];
}

function statusDefinitions(configuration: TrailConfiguration): readonly TrailStatusDefinition[] {
  return selectTrailStatusOptionGroups(configuration, "issue")
    .flatMap(({ definitions }) => definitions);
}

function buildProjectLookup(projects: readonly (TrailProject | undefined)[]): ReadonlyMap<string, TrailProject> {
  return new Map(
    projects
      .filter((project): project is TrailProject => project !== undefined)
      .map((project) => [project.id, project] as const),
  );
}

/** Project swimlanes are presentation-only; no rank or relationship is persisted here. */
function buildTrailWorkflowLanes(
  issues: readonly (TrailWorkflowIssue | undefined)[],
  projects: ReadonlyMap<string, TrailProject>,
  laneMode: TrailWorkflowLaneMode,
): readonly TrailWorkflowLane[] {
  const readableIssues = issues.filter((issue): issue is TrailWorkflowIssue => issue !== undefined);
  if (laneMode === "single") {
    return [{
      issueIds: readableIssues.map(({ id }) => id),
      key: "single",
      label: "Issues",
      projectId: readableIssues[0]?.projectId,
    }];
  }

  const groups = new Map<string | undefined, string[]>();
  for (const issue of readableIssues) {
    const existing = groups.get(issue.projectId) ?? [];
    existing.push(issue.id);
    groups.set(issue.projectId, existing);
  }
  return [...groups.entries()]
    .map(([projectId, issueIds]) => ({
      issueIds,
      key: projectId ?? "projectless",
      label: projectId === undefined
        ? "No Project"
        : projects.get(projectId)?.title ?? projectId,
      projectId,
    }))
    .sort((left, right) => {
      if (left.projectId === undefined) return 1;
      if (right.projectId === undefined) return -1;
      const labelOrder = left.label.localeCompare(right.label);
      return labelOrder !== 0 ? labelOrder : left.key.localeCompare(right.key);
    });
}

export function TrailWorkflowPresentation(props: {
  readonly actions: TrailUiActions["issues"];
  readonly configuration: TrailConfiguration;
  readonly issueIds: readonly string[];
  readonly laneMode: TrailWorkflowLaneMode;
  readonly onError: (message: string | undefined) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const [mode, setMode] = useState<TrailWorkflowPresentationMode>("list");
  const instanceId = useMemo(() => Symbol("trail-workflow-board"), []);
  const issues = useStore(
    props.runtimeStore,
    useShallow((state) => props.issueIds.map((issueId) => (
      selectTrailReadableWorkflowIssueById(state, issueId)
    ))),
  );
  const projectIds = useMemo(
    () => [...new Set(issues.map((issue) => issue?.projectId).filter((id): id is string => id !== undefined))],
    [issues],
  );
  const projects = useStore(
    props.runtimeStore,
    useShallow((state) => projectIds.map((projectId) => (
      selectTrailReadableProjectById(state, projectId)
    ))),
  );
  const statuses = useMemo(
    () => statusDefinitions(props.configuration),
    [props.configuration],
  );
  const lanes = useMemo(
    () => buildTrailWorkflowLanes(issues, buildProjectLookup(projects), props.laneMode),
    [issues, projects, props.laneMode],
  );
  const statusMutation = useTrailWorkflowIssueStatusMutation({
    actions: props.actions,
    onError: props.onError,
    runtimeStore: props.runtimeStore,
    writable: props.writable,
  });

  const requestStatusById = (issueId: string, targetStatusDefinitionId: string): void => {
    const issue = selectTrailReadableWorkflowIssueById(
      props.runtimeStore.getState(),
      issueId,
    );
    if (issue !== undefined) statusMutation.requestStatus(issue, targetStatusDefinitionId);
  };

  return (
    <div className="trail-workflow-presentation">
      <div className="trail-workflow-presentation__toolbar">
        <span>View</span>
        <div className="trail-workflow-presentation__toggle" role="group" aria-label="Issue view">
          <button
            aria-pressed={mode === "list"}
            onClick={() => setMode("list")}
            type="button"
          >
            List
          </button>
          <button
            aria-pressed={mode === "board"}
            onClick={() => setMode("board")}
            type="button"
          >
            Board
          </button>
        </div>
      </div>

      {mode === "list" ? (
        <ol className="trail-workflow-issue-list">
          {props.issueIds.map((issueId) => (
            <TrailWorkflowIssueRow
              actions={props.actions}
              configuration={props.configuration}
              issueId={issueId}
              key={issueId}
              onError={props.onError}
              runtimeStore={props.runtimeStore}
              writable={props.writable}
            />
          ))}
        </ol>
      ) : (
        <TrailWorkflowBoard
          configuration={props.configuration}
          instanceId={instanceId}
          lanes={lanes}
          onDropStatus={requestStatusById}
          onRequestStatus={statusMutation.requestStatus}
          runtimeStore={props.runtimeStore}
          showLaneLabels={props.laneMode === "project"}
          statuses={statuses}
          writable={props.writable}
        />
      )}

      {mode === "board" ? statusMutation.completionDialog : null}
    </div>
  );
}

function TrailWorkflowBoard(props: {
  readonly configuration: TrailConfiguration;
  readonly instanceId: symbol;
  readonly lanes: readonly TrailWorkflowLane[];
  readonly onDropStatus: (issueId: string, targetStatusDefinitionId: string) => void;
  readonly onRequestStatus: (issue: TrailWorkflowIssue, targetStatusDefinitionId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly showLaneLabels: boolean;
  readonly statuses: readonly TrailStatusDefinition[];
  readonly writable: boolean;
}) {
  return (
    <div className="trail-workflow-board-scroll" data-lanes={props.showLaneLabels ? "project" : "single"}>
      <div className="trail-workflow-board">
        <div
          className="trail-workflow-board__row trail-workflow-board__row--header"
          data-lane-label={props.showLaneLabels ? "true" : undefined}
        >
          {props.showLaneLabels ? <div className="trail-workflow-board__corner">Project</div> : null}
          {props.statuses.map((status) => (
            <div className="trail-workflow-board__status-heading" key={status.id}>
              <strong>{status.name}</strong>
            </div>
          ))}
        </div>

        {props.lanes.map((lane) => (
          <TrailWorkflowBoardLane
            configuration={props.configuration}
            instanceId={props.instanceId}
            key={lane.key}
            lane={lane}
            onDropStatus={props.onDropStatus}
            onRequestStatus={props.onRequestStatus}
            runtimeStore={props.runtimeStore}
            showLaneLabel={props.showLaneLabels}
            statuses={props.statuses}
            writable={props.writable}
          />
        ))}
      </div>
    </div>
  );
}

function TrailWorkflowBoardLane(props: {
  readonly configuration: TrailConfiguration;
  readonly instanceId: symbol;
  readonly lane: TrailWorkflowLane;
  readonly onDropStatus: (issueId: string, targetStatusDefinitionId: string) => void;
  readonly onRequestStatus: (issue: TrailWorkflowIssue, targetStatusDefinitionId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly showLaneLabel: boolean;
  readonly statuses: readonly TrailStatusDefinition[];
  readonly writable: boolean;
}) {
  return (
    <div
      className="trail-workflow-board__row"
      data-lane-label={props.showLaneLabel ? "true" : undefined}
    >
      {props.showLaneLabel ? (
        <div className="trail-workflow-board__lane-heading">
          <strong>{props.lane.label}</strong>
          <span>{props.lane.issueIds.length} Issues</span>
        </div>
      ) : null}
      {props.statuses.map((status) => (
        <TrailWorkflowStatusCell
          configuration={props.configuration}
          instanceId={props.instanceId}
          issueIds={props.lane.issueIds}
          key={`${props.lane.key}:${status.id}`}
          onDropStatus={props.onDropStatus}
          onRequestStatus={props.onRequestStatus}
          projectId={props.lane.projectId}
          runtimeStore={props.runtimeStore}
          status={status}
          writable={props.writable}
        />
      ))}
    </div>
  );
}

function TrailWorkflowStatusCell(props: {
  readonly configuration: TrailConfiguration;
  readonly instanceId: symbol;
  readonly issueIds: readonly string[];
  readonly onDropStatus: (issueId: string, targetStatusDefinitionId: string) => void;
  readonly onRequestStatus: (issue: TrailWorkflowIssue, targetStatusDefinitionId: string) => void;
  readonly projectId?: string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly status: TrailStatusDefinition;
  readonly writable: boolean;
}) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const targetData = useMemo(
    () => createTrailWorkflowStatusDropData({
      instanceId: props.instanceId,
      projectId: props.projectId,
      targetStatusDefinitionId: props.status.id,
    }),
    [props.instanceId, props.projectId, props.status.id],
  );
  const statusIssueIds = props.issueIds.filter((issueId) => (
    selectTrailReadableWorkflowIssueById(
      props.runtimeStore.getState(),
      issueId,
    )?.statusDefinitionId === props.status.id
  ));

  const onDropStatus = props.onDropStatus;
  useEffect(() => {
    if (element === null) return undefined;
    return dropTargetForElements({
      canDrop: ({ source }) => (
        resolveTrailWorkflowStatusDrop(source.data, targetData) !== undefined
      ),
      element,
      getData: () => targetData,
      onDragEnter: ({ source }) => {
        if (resolveTrailWorkflowStatusDrop(source.data, targetData) !== undefined) {
          setDragOver(true);
        }
      },
      onDragLeave: () => setDragOver(false),
      onDrop: ({ source }) => {
        setDragOver(false);
        const intent = resolveTrailWorkflowStatusDrop(source.data, targetData);
        if (intent !== undefined) {
          onDropStatus(intent.issueId, intent.targetStatusDefinitionId);
        }
      },
    });
  }, [element, onDropStatus, targetData]);

  return (
    <section
      aria-label={`${props.status.name} Issues`}
      className="trail-workflow-board__cell"
      data-drag-over={dragOver ? "true" : undefined}
      ref={setElement}
    >
      {statusIssueIds.map((issueId) => (
        <TrailWorkflowIssueCard
          configuration={props.configuration}
          instanceId={props.instanceId}
          issueId={issueId}
          key={issueId}
          onRequestStatus={props.onRequestStatus}
          runtimeStore={props.runtimeStore}
          showProject={false}
          writable={props.writable}
        />
      ))}
      {statusIssueIds.length === 0 ? (
        <span className="trail-workflow-board__empty">Drop here</span>
      ) : null}
    </section>
  );
}
