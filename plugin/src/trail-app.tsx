import { useState } from "react";

import type {
  TrailArea,
  TrailProject,
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
}

export function TrailApp({
  data,
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
          <ProjectPage project={data.projects[0]} />
        )}

        {activePageId === "fleeting-notes" && (
          <FleetingNotesPage />
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
}: TrailAppProps) {
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
}

function ProjectPage({
  project,
}: ProjectPageProps) {
  if (!project) {
    return (
      <>
        <h2>Project</h2>
        <p>No Trail projects found.</p>
      </>
    );
  }

  return (
    <>
      <h2>Project</h2>
      <h3>{project.name}</h3>
      <p>{project.overview}</p>

      <h4>Tasks</h4>

      {project.tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <ul>
          {project.tasks.map((task) => (
            <li key={task.id}>
              <p>
                {task.title} ({task.status})
              </p>

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

function FleetingNotesPage() {
  return (
    <>
      <h2>Fleeting Notes</h2>
      <p>
        Fleeting Note parsing is outside this POC stage.
      </p>
    </>
  );
}

function formatCount(
  count: number,
  noun: string,
): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
