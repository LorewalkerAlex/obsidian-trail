import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import {
  TASK_STATUSES,
  type TrailProject,
  type TrailTask,
  type TrailTaskPriority,
  type TrailTaskStatus,
} from "./domain/trail-model";
import { useTrailTaskModal } from "./trail-task-modal-context";

const TASK_STATUS_LABELS: Record<TrailTaskStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  doing: "Doing",
  blocked: "Blocked",
  completed: "Completed",
};
const TASK_PRIORITY_ORDER: Record<TrailTaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const TRAIL_TASK_DRAG_TYPE = "application/x-trail-task";

type TrailProjectViewMode = "board" | "list";

export interface TrailProjectWorkspaceProps {
  project?: TrailProject;
  onUpdateTaskStatus: (
    task: TrailTask,
    targetStatus: TrailTaskStatus,
  ) => Promise<void>;
}
export function TrailProjectWorkspace({
  project,
  onUpdateTaskStatus,
}: TrailProjectWorkspaceProps) {
  const openTaskModal = useTrailTaskModal();
  const [viewMode, setViewMode] =
    useState<TrailProjectViewMode>("board");
  const [pendingTaskIds, setPendingTaskIds] =
    useState<Set<string>>(() => new Set());
  const [optimisticStatuses, setOptimisticStatuses] =
    useState<Map<string, TrailTaskStatus>>(() => new Map());
  const [taskErrors, setTaskErrors] =
    useState<Map<string, string>>(() => new Map());
  const [draggedTaskId, setDraggedTaskId] =
    useState<string>();
  const [dragOverStatus, setDragOverStatus] =
    useState<TrailTaskStatus>();
  const projectId = project?.id;
  const projectInteractionRef = useRef({
    projectId,
    revision: 0,
  });

  useLayoutEffect(() => {
    if (projectInteractionRef.current.projectId !== projectId) {
      projectInteractionRef.current = {
        projectId,
        revision: projectInteractionRef.current.revision + 1,
      };
    }
  }, [projectId]);

  useEffect(() => {
    setPendingTaskIds(new Set());
    setOptimisticStatuses(new Map());
    setTaskErrors(new Map());
    setDraggedTaskId(undefined);
    setDragOverStatus(undefined);
  }, [projectId]);

  useEffect(() => {
    if (!project) {
      return;
    }
    setOptimisticStatuses((current) => {
      let changed = false;
      const next = new Map(current);

      for (const [taskId, targetStatus] of current) {
        const task = project.tasks.find(
          (candidate) => candidate.id === taskId,
        );

        if (!task || task.status === targetStatus) {
          next.delete(taskId);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [project]);
  const renderedTasks = useMemo(() => {
    if (!project) {
      return [];
    }

    return project.tasks.map((task) => ({
      task,
      status: optimisticStatuses.get(task.id) ?? task.status,
    }));
  }, [optimisticStatuses, project]);

  if (!project) {
    return (
      <>
        <h2>Project</h2>
        <p>No Trail projects found.</p>
      </>
    );
  }
  const updateTaskStatus = async (
    task: TrailTask,
    targetStatus: TrailTaskStatus,
  ): Promise<void> => {
    const currentStatus =
      optimisticStatuses.get(task.id) ?? task.status;
    const mutationRevision =
      projectInteractionRef.current.revision;

    if (
      currentStatus === targetStatus
      || pendingTaskIds.has(task.id)
    ) {
      return;
    }
    setOptimisticStatuses((current) => {
      const next = new Map(current);
      next.set(task.id, targetStatus);
      return next;
    });
    setPendingTaskIds((current) => {
      const next = new Set(current);
      next.add(task.id);
      return next;
    });
    setTaskErrors((current) => {
      const next = new Map(current);
      next.delete(task.id);
      return next;
    });
    try {
      await onUpdateTaskStatus(task, targetStatus);
    } catch (error: unknown) {
      if (projectInteractionRef.current.revision === mutationRevision) {
        setOptimisticStatuses((current) => {
          const next = new Map(current);
          next.delete(task.id);
          return next;
        });
        setTaskErrors((current) => {
          const next = new Map(current);
          next.set(
            task.id,
            error instanceof Error
              ? error.message
              : "Unknown Task update error.",
          );
          return next;
        });
      }
    } finally {
      if (projectInteractionRef.current.revision === mutationRevision) {
        setPendingTaskIds((current) => {
          const next = new Set(current);
          next.delete(task.id);
          return next;
        });
      }
    }
  };
  const dropTask = (
    event: DragEvent<HTMLElement>,
    targetStatus: TrailTaskStatus,
  ): void => {
    event.preventDefault();
    const transferredTaskId = event.dataTransfer.getData(
      TRAIL_TASK_DRAG_TYPE,
    );
    const taskId = transferredTaskId !== ""
      ? transferredTaskId
      : draggedTaskId;
    const task = project.tasks.find(
      (candidate) => candidate.id === taskId,
    );

    setDraggedTaskId(undefined);
    setDragOverStatus(undefined);
    if (task) {
      void updateTaskStatus(task, targetStatus);
    }
  };
  return (
    <section
      className="trail-project-workspace"
      aria-labelledby="trail-project-title"
    >
      <header className="trail-project-workspace__header">
        <div>
          <p className="trail-project-workspace__area">
            {project.areaName}
          </p>
          <h2 id="trail-project-title">{project.name}</h2>
          <p>{project.overview}</p>
        </div>
        <div
          className="trail-project-workspace__view-toggle"
          role="group"
          aria-label="Project task view"
        >
          <button
            type="button"
            className={viewMode === "board" ? "is-active" : ""}
            aria-pressed={viewMode === "board"}
            onClick={() => setViewMode("board")}
          >
            Board
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "is-active" : ""}
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
        </div>
      </header>
      {project.tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : viewMode === "board" ? (
        <div
          className="trail-project-board"
          aria-label={`${project.name} Task Board`}
        >
          {TASK_STATUSES.map((status) => {
            const tasks = sortTrailTasks(
              renderedTasks
                .filter((item) => item.status === status)
                .map((item) => item.task),
            );
            const isDragOver = dragOverStatus === status;
            return (
              <section
                key={status}
                className={[
                  "trail-project-board__column",
                  isDragOver ? "is-drag-over" : "",
                ].filter(Boolean).join(" ")}
                aria-label={`${TASK_STATUS_LABELS[status]} Tasks`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverStatus(status);
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    setDragOverStatus((current) =>
                      current === status ? undefined : current,
                    );
                  }
                }}
                onDrop={(event) => dropTask(event, status)}
              >
                <header className="trail-project-board__column-header">
                  <h3>{TASK_STATUS_LABELS[status]}</h3>
                  <span>{tasks.length}</span>
                </header>
                {tasks.length === 0 ? (
                  <p className="trail-project-board__empty">
                    Drop a Task here.
                  </p>
                ) : (
                  <ul className="trail-project-board__tasks">
                    {tasks.map((task) => (
                      <li key={task.id}>
                        <TrailTaskCard
                          task={task}
                          status={status}
                          isPending={pendingTaskIds.has(task.id)}
                          error={taskErrors.get(task.id)}
                          onOpenTask={openTaskModal}
                          onUpdateTaskStatus={updateTaskStatus}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData(
                              TRAIL_TASK_DRAG_TYPE,
                              task.id,
                            );
                            event.dataTransfer.setData(
                              "text/plain",
                              task.id,
                            );
                            setDraggedTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(undefined);
                            setDragOverStatus(undefined);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <ul
          className="trail-project-list"
          aria-label={`${project.name} Task List`}
        >
          {sortTrailTasks(project.tasks).map((task) => (
            <li key={task.id}>
              <TrailTaskCard
                task={task}
                status={
                  optimisticStatuses.get(task.id) ?? task.status
                }
                isPending={pendingTaskIds.has(task.id)}
                error={taskErrors.get(task.id)}
                onOpenTask={openTaskModal}
                onUpdateTaskStatus={updateTaskStatus}
              />
            </li>
          ))}
        </ul>
      )}
      <section className="trail-project-workspace__notes">
        <h3>Project notes</h3>
        {project.notes.length === 0 ? (
          <p>No project notes found.</p>
        ) : (
          <ul>
            {project.notes.map((note, index) => (
              <li key={`${project.id}:note:${index}`}>
                {note.text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
interface TrailTaskCardProps {
  task: TrailTask;
  status: TrailTaskStatus;
  isPending: boolean;
  error?: string;
  onOpenTask?: (task: TrailTask) => void;
  onUpdateTaskStatus: (
    task: TrailTask,
    targetStatus: TrailTaskStatus,
  ) => Promise<void>;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
}
function TrailTaskCard({
  task,
  status,
  isPending,
  error,
  onOpenTask,
  onUpdateTaskStatus,
  onDragStart,
  onDragEnd,
}: TrailTaskCardProps) {
  const completedSubtasks = task.subtasks.filter(
    (subtask) => subtask.completed,
  ).length;
  return (
    <article
      className={[
        "trail-task-card",
        onDragStart !== undefined && !isPending
          ? "is-draggable"
          : "",
        isPending ? "is-pending" : "",
      ].filter(Boolean).join(" ")}
      aria-label={`${task.title} Task`}
      aria-busy={isPending}
      draggable={onDragStart !== undefined && !isPending}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <header className="trail-task-card__header">
        {onOpenTask === undefined ? (
          <strong>{task.title}</strong>
        ) : (
          <button
            type="button"
            aria-label={`Open ${task.title}`}
            disabled={isPending}
            draggable={false}
            onDragStart={(event) => event.stopPropagation()}
            onClick={() => onOpenTask(task)}
          >
            <strong>{task.title}</strong>
          </button>
        )}
        {isPending && (
          <span className="trail-task-card__pending">
            Updating...
          </span>
        )}
      </header>
      <div className="trail-task-card__meta">
        <span>Priority: {task.priority}</span>
        <span>Due: {task.due ?? "None"}</span>
        <span>
          Subtasks: {completedSubtasks}/{task.subtasks.length}
        </span>
      </div>
      {task.labels.length > 0 && (
        <div
          className="trail-task-card__labels"
          aria-label={`${task.title} labels`}
        >
          {task.labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
      <label className="trail-task-card__status">
        <span>Status</span>
        <select
          aria-label={`Status for ${task.title}`}
          value={status}
          disabled={isPending}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            void onUpdateTaskStatus(
              task,
              event.currentTarget.value as TrailTaskStatus,
            );
          }}
        >
          {TASK_STATUSES.map((optionStatus) => (
            <option key={optionStatus} value={optionStatus}>
              {TASK_STATUS_LABELS[optionStatus]}
            </option>
          ))}
        </select>
      </label>
      {error !== undefined && (
        <p className="trail-task-card__error" role="alert">
          Task update failed: {error}
        </p>
      )}
    </article>
  );
}
export function sortTrailTasks(
  tasks: readonly TrailTask[],
): TrailTask[] {
  return [...tasks].sort((left, right) => {
    const priorityComparison =
      TASK_PRIORITY_ORDER[left.priority]
      - TASK_PRIORITY_ORDER[right.priority];

    if (priorityComparison !== 0) {
      return priorityComparison;
    }

    const dueComparison = compareOptionalText(
      left.due,
      right.due,
    );

    if (dueComparison !== 0) {
      return dueComparison;
    }
    const createdComparison = left.created.localeCompare(
      right.created,
    );

    return createdComparison !== 0
      ? createdComparison
      : left.id.localeCompare(right.id);
  });
}

function compareOptionalText(
  left: string | undefined,
  right: string | undefined,
): number {
  if (left === undefined) {
    return right === undefined ? 0 : 1;
  }

  if (right === undefined) {
    return -1;
  }

  return left.localeCompare(right);
}
