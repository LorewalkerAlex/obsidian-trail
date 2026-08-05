import { useState } from "react";

import {
  TrailCrossFileMutationError,
} from "./domain/trail-cross-file-mutation";
import type {
  TrailArea,
  TrailFleetingNote,
  TrailProject,
  TrailTask,
  TrailTaskStatus,
} from "./domain/trail-model";
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
  onConvertFleetingNoteToTask: (
    note: TrailFleetingNote,
    project: TrailProject,
  ) => Promise<void>;
}

export function TrailApp({
  data,
  onUpdateTaskStatus,
  onConvertFleetingNoteToTask,
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
            projects={data.projects}
            onConvertFleetingNoteToTask={
              onConvertFleetingNoteToTask
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
  projects: TrailProject[];
  onConvertFleetingNoteToTask:
    TrailAppProps["onConvertFleetingNoteToTask"];
}

function FleetingNotesPage({
  notes,
  projects,
  onConvertFleetingNoteToTask,
}: FleetingNotesPageProps) {
  const [selectedProjectIds, setSelectedProjectIds] =
    useState<Map<string, string>>(() => new Map());
  const [pendingNoteIds, setPendingNoteIds] =
    useState<Set<string>>(() => new Set());
  const [blockedNoteIds, setBlockedNoteIds] =
    useState<Set<string>>(() => new Set());
  const [conversionErrors, setConversionErrors] =
    useState<Map<string, string>>(() => new Map());

  const convertNote = async (
    note: TrailFleetingNote,
    project: TrailProject,
  ): Promise<void> => {
    setPendingNoteIds((current) => {
      const next = new Set(current);
      next.add(note.id);
      return next;
    });
    setConversionErrors((current) => {
      const next = new Map(current);
      next.delete(note.id);
      return next;
    });

    try {
      await onConvertFleetingNoteToTask(note, project);
    } catch (error: unknown) {
      if (
        error instanceof TrailCrossFileMutationError
        && error.outcome === "partial"
      ) {
        setBlockedNoteIds((current) => {
          const next = new Set(current);
          next.add(note.id);
          return next;
        });
      }

      setConversionErrors((current) => {
        const next = new Map(current);
        next.set(
          note.id,
          formatFleetingNoteConversionError(error),
        );
        return next;
      });
    } finally {
      setPendingNoteIds((current) => {
        const next = new Set(current);
        next.delete(note.id);
        return next;
      });
    }
  };

  return (
    <>
      <h2>Fleeting Notes</h2>

      {notes.length === 0 ? (
        <p>No Fleeting Notes found.</p>
      ) : (
        <ul aria-label="Fleeting Notes">
          {notes.map((note) => {
            const selectedProjectId =
              selectedProjectIds.get(note.id)
              ?? projects[0]?.id
              ?? "";
            const selectedProject = projects.find(
              (project) => project.id === selectedProjectId,
            );
            const isPending = pendingNoteIds.has(note.id);
            const isBlocked = blockedNoteIds.has(note.id);
            const conversionError =
              conversionErrors.get(note.id);

            return (
              <li key={note.id}>
                <strong>{note.text}</strong>
                <p>Created: {note.created}</p>
                {note.cleanupDue !== undefined && (
                  <p>Cleanup due: {note.cleanupDue}</p>
                )}

                {projects.length === 0 ? (
                  <p>No target Projects available.</p>
                ) : (
                  <label>
                    Target Project
                    <select
                      aria-label={
                        `Target Project for ${note.text}`
                      }
                      value={selectedProjectId}
                      disabled={isPending || isBlocked}
                      onChange={(event) => {
                        setSelectedProjectIds((current) => {
                          const next = new Map(current);
                          next.set(
                            note.id,
                            event.currentTarget.value,
                          );
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
                      void convertNote(note, selectedProject);
                    }
                  }}
                >
                  {fleetingNoteConversionButtonLabel(
                    isPending,
                    isBlocked,
                  )}
                </button>

                {conversionError !== undefined && (
                  <p role="alert">{conversionError}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}


function fleetingNoteConversionButtonLabel(
  isPending: boolean,
  isBlocked: boolean,
): string {
  if (isPending) {
    return "Converting...";
  }

  return isBlocked
    ? "Review required"
    : "Convert to Task";
}

function formatFleetingNoteConversionError(
  error: unknown,
): string {
  if (error instanceof TrailCrossFileMutationError) {
    const guidance = error.outcome === "partial"
      ? " Manual review is required before retrying."
      : " The Fleeting Note remains available to retry.";

    return `Conversion result: ${error.outcome}. ${error.message}${guidance}`;
  }

  const message = error instanceof Error
    ? error.message
    : "Unknown Fleeting Note conversion error.";

  return `Conversion failed: ${message}`;
}

function formatCount(
  count: number,
  noun: string,
): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
