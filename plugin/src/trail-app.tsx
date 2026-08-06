import { useState, type ChangeEvent } from "react";

import {
  TrailCrossFileMutationError,
} from "./domain/trail-cross-file-mutation";
import type {
  TrailArea,
  TrailFleetingNote,
  TrailProject,
  TrailStoredFleetingNote,
  TrailTask,
  TrailTaskStatus,
} from "./domain/trail-model";
import {
  suggestTrailProjectName,
} from "./domain/trail-project-creation";
import type { TrailVaultReadResult } from "./domain/trail-vault-reader";
const TRAIL_PAGES = [
  {
    id: "dashboard",
    label: "Dashboard",
  },
  {
    id: "areas",
    label: "Areas",
  },
  {
    id: "project",
    label: "Project",
  },
  {
    id: "fleeting-notes",
    label: "Fleeting Notes",
  },
] as const;

type TrailPageId = (typeof TRAIL_PAGES)[number]["id"];
export interface TrailAppProps {
  data: TrailVaultReadResult;
  onUpdateTaskStatus: (
    task: TrailTask,
    targetStatus: TrailTaskStatus,
  ) => Promise<void>;
  onConvertFleetingNoteToProject?: (
    note: TrailFleetingNote,
    area: TrailArea,
    projectName: string,
  ) => Promise<void>;
  onConvertFleetingNoteToTask: (
    note: TrailFleetingNote,
    project: TrailProject,
  ) => Promise<void>;
  onArchiveFleetingNote?: (
    note: TrailFleetingNote,
  ) => Promise<void>;
  onDeleteFleetingNote?: (
    note: TrailFleetingNote,
  ) => Promise<void>;
  onRestoreFleetingNote?: (
    note: TrailStoredFleetingNote,
  ) => Promise<void>;
}

export function TrailApp({
  data,
  onUpdateTaskStatus,
  onConvertFleetingNoteToProject,
  onConvertFleetingNoteToTask,
  onArchiveFleetingNote,
  onDeleteFleetingNote,
  onRestoreFleetingNote,
}: TrailAppProps) {
  const [activePageId, setActivePageId] =
    useState<TrailPageId>("dashboard");
  return (
    <div className="trail-app">
      <header className="trail-app__header">
        <p className="trail-app__eyebrow">
          Obsidian plugin POC
        </p>
        <h1 className="trail-app__title">Trail</h1>
      </header>
      <nav
        className="trail-app__navigation"
        aria-label="Trail pages"
      >
        {TRAIL_PAGES.map((page) => (
          <button
            key={page.id}
            type="button"
            className={
              page.id === activePageId
                ? "trail-app__nav-button is-active"
                : "trail-app__nav-button"
            }
            aria-current={
              page.id === activePageId
                ? "page"
                : undefined
            }
            onClick={() => setActivePageId(page.id)}
          >
            {page.label}
          </button>
        ))}
      </nav>
      <main className="trail-app__content">
        {activePageId === "dashboard" && (
          <DashboardPage data={data} />
        )}

        {activePageId === "areas" && (
          <AreasPage
            areas={data.areas}
            projects={data.projects}
          />
        )}

        {activePageId === "project" && (
          <ProjectPage
            project={data.projects[0]}
            onUpdateTaskStatus={onUpdateTaskStatus}
          />
        )}
        {activePageId === "fleeting-notes" && (
          <FleetingNotesPage
            notes={data.fleetingNotes}
            areas={data.areas}
            archivedNotes={
              data.archivedFleetingNotes ?? []
            }
            trashedNotes={
              data.trashedFleetingNotes ?? []
            }
            projects={data.projects}
            onConvertFleetingNoteToProject={
              onConvertFleetingNoteToProject
            }
            onConvertFleetingNoteToTask={
              onConvertFleetingNoteToTask
            }
            onArchiveFleetingNote={
              onArchiveFleetingNote
            }
            onDeleteFleetingNote={
              onDeleteFleetingNote
            }
            onRestoreFleetingNote={
              onRestoreFleetingNote
            }
          />
        )}
      </main>
      {data.issues.length > 0 && (
        <section
          className="trail-app__issues"
          aria-label="Data issues"
        >
          <h2>Data issues</h2>
          <ul>
            {data.issues.map((issue, index) => (
              <li
                key={[
                  issue.filePath,
                  issue.code,
                  issue.line ?? "",
                  index,
                ].join(":")}
              >
                {issue.filePath}: {issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
function DashboardPage({
  data,
}: Pick<TrailAppProps, "data">) {
  const taskCount = data.projects.reduce(
    (total, project) =>
      total + project.tasks.length,
    0,
  );

  return (
    <>
      <h2>Dashboard</h2>
      <p>
        {formatCount(data.areas.length, "Area")}
        {" · "}
        {formatCount(data.projects.length, "Project")}
        {" · "}
        {formatCount(taskCount, "Task")}
      </p>
    </>
  );
}
interface AreasPageProps {
  areas: TrailArea[];
  projects: TrailProject[];
}

function AreasPage({
  areas,
  projects,
}: AreasPageProps) {
  return (
    <>
      <h2>Areas</h2>

      {areas.length === 0 ? (
        <p>No Trail areas found.</p>
      ) : (
        <ul>
          {areas.map((area) => {
            const areaProjects = projects.filter(
              (project) => project.areaId === area.id,
            );
            return (
              <li key={area.id}>
                <strong>{area.name}</strong>
                {areaProjects.length === 0 ? (
                  <p>No projects found.</p>
                ) : (
                  <ul>
                    {areaProjects.map((project) => (
                      <li key={project.id}>
                        {project.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
interface ProjectPageProps {
  project?: TrailProject;
  onUpdateTaskStatus: (
    task: TrailTask,
    targetStatus: TrailTaskStatus,
  ) => Promise<void>;
}

function ProjectPage({
  project,
  onUpdateTaskStatus,
}: ProjectPageProps) {
  const [pendingTaskIds, setPendingTaskIds] =
    useState<Set<string>>(() => new Set());
  const [mutationError, setMutationError] =
    useState<string>();
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
    setPendingTaskIds((current) => {
      const next = new Set(current);
      next.add(task.id);
      return next;
    });
    setMutationError(undefined);
    try {
      await onUpdateTaskStatus(task, targetStatus);
    } catch (error: unknown) {
      setMutationError(
        error instanceof Error
          ? error.message
          : "Unknown Task update error.",
      );
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  };

  return (
    <>
      <h2>Project</h2>
      <h3>{project.name}</h3>
      <p>{project.overview}</p>
      <h4>Tasks</h4>
      {mutationError !== undefined && (
        <p role="alert">
          Task update failed: {mutationError}
        </p>
      )}

      {project.tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <ul>
          {project.tasks.map((task) => (
            <li key={task.id}>
              <p>
                {task.title} ({task.status})
              </p>
              <TaskStatusButton
                task={task}
                isPending={pendingTaskIds.has(task.id)}
                onUpdateTaskStatus={updateTaskStatus}
              />
              {task.subtasks.length > 0 && (
                <>
                  <h5>Subtasks</h5>
                  <ul>
                    {task.subtasks.map(
                      (subtask, index) => (
                        <li
                          key={`${task.id}:subtask:${index}`}
                        >
                          {subtask.completed
                            ? "[x]"
                            : "[ ]"}{" "}
                          {subtask.text}
                        </li>
                      ),
                    )}
                  </ul>
                </>
              )}
              {task.notes.length > 0 && (
                <>
                  <h5>Task notes</h5>
                  <ul>
                    {task.notes.map((note, index) => (
                      <li
                        key={`${task.id}:note:${index}`}
                      >
                        {note.text}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <h4>Notes</h4>
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
    </>
  );
}

interface TaskStatusButtonProps {
  task: TrailTask;
  isPending: boolean;
  onUpdateTaskStatus: TrailAppProps["onUpdateTaskStatus"];
}
function TaskStatusButton({
  task,
  isPending,
  onUpdateTaskStatus,
}: TaskStatusButtonProps) {
  let targetStatus: TrailTaskStatus;

  if (task.status === "todo") {
    targetStatus = "doing";
  } else if (task.status === "doing") {
    targetStatus = "todo";
  } else {
    return null;
  }
  return (
    <button
      type="button"
      aria-label={`Mark ${task.title} as ${targetStatus}`}
      disabled={isPending}
      onClick={() => {
        void onUpdateTaskStatus(task, targetStatus);
      }}
    >
      {isPending
        ? "Updating..."
        : `Mark ${targetStatus}`}
    </button>
  );
}

interface FleetingNotesPageProps {
  notes: TrailVaultReadResult["fleetingNotes"];
  archivedNotes: TrailStoredFleetingNote[];
  areas: TrailArea[];
  trashedNotes: TrailStoredFleetingNote[];
  projects: TrailProject[];
  onConvertFleetingNoteToProject:
    TrailAppProps["onConvertFleetingNoteToProject"];
  onConvertFleetingNoteToTask:
    TrailAppProps["onConvertFleetingNoteToTask"];
  onArchiveFleetingNote:
    TrailAppProps["onArchiveFleetingNote"];
  onDeleteFleetingNote:
    TrailAppProps["onDeleteFleetingNote"];
  onRestoreFleetingNote:
    TrailAppProps["onRestoreFleetingNote"];
}

type FleetingNoteAction =
  | "convert-project"
  | "convert"
  | "archive"
  | "delete"
  | "restore";

function FleetingNotesPage({
  notes,
  archivedNotes,
  trashedNotes,
  areas,
  projects,
  onConvertFleetingNoteToProject,
  onConvertFleetingNoteToTask,
  onArchiveFleetingNote,
  onDeleteFleetingNote,
  onRestoreFleetingNote,
}: FleetingNotesPageProps) {
  const [selectedAreaIds, setSelectedAreaIds] =
    useState<Map<string, string>>(() => new Map());
  const [projectNames, setProjectNames] =
    useState<Map<string, string>>(() => new Map());
  const [selectedProjectIds, setSelectedProjectIds] =
    useState<Map<string, string>>(() => new Map());
  const [pendingActions, setPendingActions] =
    useState<Map<string, FleetingNoteAction>>(
      () => new Map(),
    );
  const [blockedNoteIds, setBlockedNoteIds] =
    useState<Set<string>>(() => new Set());
  const [actionErrors, setActionErrors] =
    useState<Map<string, string>>(() => new Map());

  const runNoteAction = async (
    noteId: string,
    rowKey: string,
    action: FleetingNoteAction,
    execute: () => Promise<void>,
  ): Promise<void> => {
    setPendingActions((current) => {
      const next = new Map(current);
      next.set(rowKey, action);
      return next;
    });
    setActionErrors((current) => {
      const next = new Map(current);
      next.delete(rowKey);
      return next;
    });

    try {
      await execute();
    } catch (error: unknown) {
      if (
        error instanceof TrailCrossFileMutationError
        && error.outcome === "partial"
      ) {
        setBlockedNoteIds((current) => {
          const next = new Set(current);
          next.add(noteId);
          return next;
        });
      }

      setActionErrors((current) => {
        const next = new Map(current);
        next.set(
          rowKey,
          formatFleetingNoteActionError(action, error),
        );
        return next;
      });
    } finally {
      setPendingActions((current) => {
        const next = new Map(current);
        next.delete(rowKey);
        return next;
      });
    }
  };

  const sortedNotes = sortFleetingNotesByCreated(notes);
  const sortedArchivedNotes = sortFleetingNotesByCreated(
    archivedNotes,
  );
  const sortedTrashedNotes = sortFleetingNotesByCreated(
    trashedNotes,
  );

  return (
    <section
      className="trail-fleeting-notes"
      aria-labelledby="trail-fleeting-notes-title"
    >
      <h2 id="trail-fleeting-notes-title">
        Fleeting Notes
      </h2>

      <section
        className="trail-fleeting-notes__section"
        aria-label="Active Fleeting Notes"
      >
        <div className="trail-fleeting-notes__section-header">
          <h3>Active</h3>
          <span className="trail-fleeting-notes__count">
            {formatCount(sortedNotes.length, "Note")}
          </span>
        </div>
        {sortedNotes.length === 0 ? (
          <p className="trail-fleeting-notes__empty">
            No Fleeting Notes found.
          </p>
        ) : (
          <ul
            className="trail-fleeting-notes__list"
            aria-label="Fleeting Notes"
          >
            {sortedNotes.map((note) => {
              const rowKey = `active:${note.id}`;
              const selectedAreaId =
                selectedAreaIds.get(note.id)
                ?? areas[0]?.id
                ?? "";
              const selectedArea = areas.find(
                (area) => area.id === selectedAreaId,
              );
              const projectName = projectNames.get(note.id)
                ?? suggestTrailProjectName(note.text);
              const selectedProjectId =
                selectedProjectIds.get(note.id)
                ?? projects[0]?.id
                ?? "";
              const selectedProject = projects.find(
                (project) => project.id === selectedProjectId,
              );
              const pendingAction =
                pendingActions.get(rowKey);
              const isPending = pendingAction !== undefined;
              const isBlocked = blockedNoteIds.has(note.id);
              const actionError = actionErrors.get(rowKey);
              return (
                <li
                  key={note.id}
                  className="trail-fleeting-note-card"
                >
                  <div className="trail-fleeting-note-card__header">
                    <strong className="trail-fleeting-note-card__title">
                      {note.text}
                    </strong>
                    <div className="trail-fleeting-note-card__meta">
                      <span>Created: {note.created}</span>
                      {note.cleanupDue !== undefined && (
                        <span>
                          Cleanup due: {note.cleanupDue}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="trail-fleeting-note-card__controls">
                    <div className="trail-fleeting-note-card__conversion-grid">
                      <div className="trail-fleeting-note-card__conversion">
                        <strong className="trail-fleeting-note-card__conversion-title">
                          New Project
                        </strong>

                        {areas.length === 0 ? (
                          <p className="trail-fleeting-notes__empty">
                            No target Areas available.
                          </p>
                        ) : (
                          <div className="trail-fleeting-note-card__conversion-fields">
                            <label className="trail-fleeting-note-card__target">
                              <span>Project name</span>
                              <input
                                type="text"
                                aria-label={
                                  `Project name for ${note.text}`
                                }
                                value={projectName}
                                disabled={isPending || isBlocked}
                                onChange={(
                                  event: ChangeEvent<HTMLInputElement>,
                                ) => {
                                  const value = event.currentTarget.value;
                                  setProjectNames((current) => {
                                    const next = new Map(current);
                                    next.set(note.id, value);
                                    return next;
                                  });
                                }}
                              />
                            </label>
                            <label className="trail-fleeting-note-card__target">
                              <span>Target Area</span>
                              <select
                                aria-label={
                                  `Target Area for ${note.text}`
                                }
                                value={selectedAreaId}
                                disabled={isPending || isBlocked}
                                onChange={(
                                  event: ChangeEvent<HTMLSelectElement>,
                                ) => {
                                  const value = event.currentTarget.value;
                                  setSelectedAreaIds((current) => {
                                    const next = new Map(current);
                                    next.set(note.id, value);
                                    return next;
                                  });
                                }}
                              >
                                {areas.map((area) => (
                                  <option
                                    key={area.id}
                                    value={area.id}
                                  >
                                    {area.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        )}

                        <button
                          type="button"
                          aria-label={`Convert ${note.text} to Project`}
                          disabled={
                            onConvertFleetingNoteToProject === undefined
                            || selectedArea === undefined
                            || projectName.trim() === ""
                            || isPending
                            || isBlocked
                          }
                          onClick={() => {
                            if (
                              onConvertFleetingNoteToProject !== undefined
                              && selectedArea !== undefined
                              && projectName.trim() !== ""
                            ) {
                              void runNoteAction(
                                note.id,
                                rowKey,
                                "convert-project",
                                () => onConvertFleetingNoteToProject(
                                  note,
                                  selectedArea,
                                  projectName.trim(),
                                ),
                              );
                            }
                          }}
                        >
                          {fleetingNoteActionButtonLabel(
                            "convert-project",
                            pendingAction,
                            isBlocked,
                          )}
                        </button>
                      </div>

                      <div className="trail-fleeting-note-card__conversion">
                        <strong className="trail-fleeting-note-card__conversion-title">
                          New Task
                        </strong>

                        {projects.length === 0 ? (
                          <p className="trail-fleeting-notes__empty">
                            No target Projects available.
                          </p>
                        ) : (
                          <label className="trail-fleeting-note-card__target">
                            <span>Target Project</span>
                            <select
                              aria-label={
                                `Target Project for ${note.text}`
                              }
                              value={selectedProjectId}
                              disabled={isPending || isBlocked}
                              onChange={(
                                event: ChangeEvent<HTMLSelectElement>,
                              ) => {
                                const value = event.currentTarget.value;
                                setSelectedProjectIds((current) => {
                                  const next = new Map(current);
                                  next.set(note.id, value);
                                  return next;
                                });
                              }}
                            >
                              {projects.map((project) => (
                                <option
                                  key={project.id}
                                  value={project.id}
                                >
                                  {project.areaName} / {project.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        <button
                          type="button"
                          aria-label={`Convert ${note.text} to Task`}
                          disabled={
                            selectedProject === undefined
                            || isPending
                            || isBlocked
                          }
                          onClick={() => {
                            if (selectedProject !== undefined) {
                              void runNoteAction(
                                note.id,
                                rowKey,
                                "convert",
                                () => onConvertFleetingNoteToTask(
                                  note,
                                  selectedProject,
                                ),
                              );
                            }
                          }}
                        >
                          {fleetingNoteActionButtonLabel(
                            "convert",
                            pendingAction,
                            isBlocked,
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="trail-fleeting-note-card__lifecycle-actions">
                      <button
                        type="button"
                        aria-label={`Archive ${note.text}`}
                        disabled={
                          onArchiveFleetingNote === undefined
                          || isPending
                          || isBlocked
                        }
                        onClick={() => {
                          if (onArchiveFleetingNote !== undefined) {
                            void runNoteAction(
                              note.id,
                              rowKey,
                              "archive",
                              () => onArchiveFleetingNote(note),
                            );
                          }
                        }}
                      >
                        {fleetingNoteActionButtonLabel(
                          "archive",
                          pendingAction,
                          isBlocked,
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${note.text}`}
                        disabled={
                          onDeleteFleetingNote === undefined
                          || isPending
                          || isBlocked
                        }
                        onClick={() => {
                          if (onDeleteFleetingNote !== undefined) {
                            void runNoteAction(
                              note.id,
                              rowKey,
                              "delete",
                              () => onDeleteFleetingNote(note),
                            );
                          }
                        }}
                      >
                        {fleetingNoteActionButtonLabel(
                          "delete",
                          pendingAction,
                          isBlocked,
                        )}
                      </button>
                    </div>
                  </div>

                  {actionError !== undefined && (
                    <p
                      className="trail-fleeting-note-card__error"
                      role="alert"
                    >
                      {actionError}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <StoredFleetingNotesSection
        title="Archived"
        emptyMessage="No archived Fleeting Notes."
        notes={sortedArchivedNotes}
        pendingActions={pendingActions}
        blockedNoteIds={blockedNoteIds}
        actionErrors={actionErrors}
        onRestoreFleetingNote={onRestoreFleetingNote}
        onRunAction={runNoteAction}
      />
      <StoredFleetingNotesSection
        title="Trash"
        emptyMessage="No deleted Fleeting Notes."
        notes={sortedTrashedNotes}
        pendingActions={pendingActions}
        blockedNoteIds={blockedNoteIds}
        actionErrors={actionErrors}
        onRestoreFleetingNote={onRestoreFleetingNote}
        onRunAction={runNoteAction}
      />
    </section>
  );
}

interface StoredFleetingNotesSectionProps {
  title: string;
  emptyMessage: string;
  notes: TrailStoredFleetingNote[];
  pendingActions: Map<string, FleetingNoteAction>;
  blockedNoteIds: Set<string>;
  actionErrors: Map<string, string>;
  onRestoreFleetingNote:
    TrailAppProps["onRestoreFleetingNote"];
  onRunAction: (
    noteId: string,
    rowKey: string,
    action: FleetingNoteAction,
    execute: () => Promise<void>,
  ) => Promise<void>;
}

function StoredFleetingNotesSection({
  title,
  emptyMessage,
  notes,
  pendingActions,
  blockedNoteIds,
  actionErrors,
  onRestoreFleetingNote,
  onRunAction,
}: StoredFleetingNotesSectionProps) {
  return (
    <section
      className="trail-fleeting-notes__section"
      aria-label={`${title} Fleeting Notes`}
    >
      <div className="trail-fleeting-notes__section-header">
        <h3>{title}</h3>
        <span className="trail-fleeting-notes__count">
          {formatCount(notes.length, "Note")}
        </span>
      </div>
      {notes.length === 0 ? (
        <p className="trail-fleeting-notes__empty">
          {emptyMessage}
        </p>
      ) : (
        <ul className="trail-fleeting-notes__list">
          {notes.map((note) => {
            const rowKey = `${note.storage}:${note.id}`;
            const pendingAction =
              pendingActions.get(rowKey);
            const isPending = pendingAction !== undefined;
            const isBlocked = blockedNoteIds.has(note.id);
            const actionError = actionErrors.get(rowKey);
            return (
              <li
                key={rowKey}
                className="trail-fleeting-note-card"
              >
                <div className="trail-fleeting-note-card__header">
                  <strong className="trail-fleeting-note-card__title">
                    {note.text}
                  </strong>
                  <div className="trail-fleeting-note-card__meta">
                    <span>Created: {note.created}</span>
                    <span>
                      {note.storage === "archive"
                        ? "Archived"
                        : "Deleted"}: {note.storedAt}
                    </span>
                  </div>
                </div>

                <div className="trail-fleeting-note-card__actions">
                  <button
                    type="button"
                    aria-label={
                      `Restore ${note.storage} ${note.text}`
                    }
                    disabled={
                      onRestoreFleetingNote === undefined
                      || isPending
                      || isBlocked
                    }
                    onClick={() => {
                      if (onRestoreFleetingNote !== undefined) {
                        void onRunAction(
                          note.id,
                          rowKey,
                          "restore",
                          () => onRestoreFleetingNote(note),
                        );
                      }
                    }}
                  >
                    {fleetingNoteActionButtonLabel(
                      "restore",
                      pendingAction,
                      isBlocked,
                    )}
                  </button>
                </div>

                {actionError !== undefined && (
                  <p
                    className="trail-fleeting-note-card__error"
                    role="alert"
                  >
                    {actionError}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface CreatedFleetingNote {
  id: string;
  created: string;
}

function sortFleetingNotesByCreated<
  T extends CreatedFleetingNote,
>(notes: readonly T[]): T[] {
  return [...notes].sort((left, right) => {
    const leftTime = Date.parse(left.created);
    const rightTime = Date.parse(right.created);

    if (
      !Number.isNaN(leftTime)
      && !Number.isNaN(rightTime)
      && leftTime !== rightTime
    ) {
      return leftTime - rightTime;
    }

    const createdComparison = left.created.localeCompare(
      right.created,
    );
    return createdComparison !== 0
      ? createdComparison
      : left.id.localeCompare(right.id);
  });
}

function fleetingNoteActionButtonLabel(
  action: FleetingNoteAction,
  pendingAction: FleetingNoteAction | undefined,
  isBlocked: boolean,
): string {
  if (isBlocked) {
    return "Review required";
  }

  if (pendingAction === action) {
    switch (action) {
      case "convert-project":
        return "Converting to Project...";
      case "convert":
        return "Converting...";
      case "archive":
        return "Archiving...";
      case "delete":
        return "Deleting...";
      case "restore":
        return "Restoring...";
    }
  }

  switch (action) {
    case "convert-project":
      return "Convert to Project";
    case "convert":
      return "Convert to Task";
    case "archive":
      return "Archive";
    case "delete":
      return "Delete";
    case "restore":
      return "Restore";
  }
}
function formatFleetingNoteActionError(
  action: FleetingNoteAction,
  error: unknown,
): string {
  let label: string;
  if (action === "convert") {
    label = "Conversion";
  } else if (action === "convert-project") {
    label = "Project conversion";
  } else {
    label = `${action[0].toUpperCase()}${action.slice(1)}`;
  }

  if (error instanceof TrailCrossFileMutationError) {
    const guidance = error.outcome === "partial"
      ? " Manual review is required before retrying."
      : " The Fleeting Note remains available to retry.";
    const causeDetail = error.cause instanceof Error
      ? ` ${error.cause.message}`
      : "";

    return `${label} result: ${error.outcome}. `
      + `${error.message}${causeDetail}${guidance}`;
  }

  const message = error instanceof Error
    ? error.message
    : `Unknown Fleeting Note ${action} error.`;
  return `${label} failed: ${message}`;
}

function formatCount(
  count: number,
  noun: string,
): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
