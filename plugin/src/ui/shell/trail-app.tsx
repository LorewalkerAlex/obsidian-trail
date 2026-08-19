import { useState } from "react";
import { useStore } from "zustand";

import { selectTrailReadableConfiguration } from "../../query/shared/trail-effective-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailCyclesPage } from "../pages/cycles/trail-cycles-page";
import {
  TrailProjectsPage,
  type TrailProjectsNavigationRequest,
} from "../pages/projects/trail-projects-page";
import { TrailSearchPage } from "../pages/search/trail-search-page";
import { TrailTriagePage } from "../pages/triage/trail-triage-page";
import { TrailStatusPanel } from "../patterns/trail-feedback";
import type { TrailUiActions } from "./trail-ui-actions";

type TrailPage = "cycles" | "projects" | "search" | "triage";

function pageTitle(page: TrailPage): string {
  switch (page) {
    case "cycles": return "Cycles";
    case "projects": return "Projects";
    case "search": return "Search";
    case "triage": return "Triage";
  }
}

function pageSubtitle(page: TrailPage): string {
  switch (page) {
    case "cycles":
      return "Plan the period explicitly, then execute the Current Cycle through the same Workflow Status system.";
    case "projects":
      return "Organize outcomes by Initiative and Milestone, then execute Issues in List or Board.";
    case "search":
      return "Find current Trail work, inspect Issues in place, or route directly to structural context.";
    case "triage":
      return "Capture now. Decide what it becomes when you are ready.";
  }
}

export function TrailApp(props: {
  readonly actions: TrailUiActions;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const control = useStore(props.runtimeStore, (state) => state.control);
  const committedRevision = useStore(
    props.runtimeStore,
    (state) => state.committed.revision,
  );
  const configuration = useStore(
    props.runtimeStore,
    selectTrailReadableConfiguration,
  );
  const [activePage, setActivePage] = useState<TrailPage>("triage");
  const [projectsNavigation, setProjectsNavigation] = useState<TrailProjectsNavigationRequest>();
  const writable = control.kind === "ready";
  const hasReadableSnapshot = committedRevision > 0 && configuration !== null;

  const openProjectsRoot = (): void => {
    setProjectsNavigation(undefined);
    setActivePage("projects");
  };

  const openProject = (projectId: string): void => {
    setProjectsNavigation((current) => ({
      requestId: (current?.requestId ?? 0) + 1,
      target: { kind: "project", projectId },
    }));
    setActivePage("projects");
  };

  const openInitiative = (initiativeId: string): void => {
    setProjectsNavigation((current) => ({
      requestId: (current?.requestId ?? 0) + 1,
      target: { initiativeId, kind: "initiative" },
    }));
    setActivePage("projects");
  };

  return (
    <div className="trail-app" data-runtime-control={control.kind}>
      <header className="trail-app__header">
        <div>
          <p className="trail-app__eyebrow">Trail</p>
          <h1 className="trail-app__title">{pageTitle(activePage)}</h1>
        </div>
        <p className="trail-app__subtitle">{pageSubtitle(activePage)}</p>
      </header>

      {control.kind === "loading" ? (
        <TrailStatusPanel
          title="Loading Trail"
          message="Validating managed Trail data and rebuilding runtime state."
        />
      ) : null}
      {control.kind === "refreshing" ? (
        <TrailStatusPanel
          title="Refreshing Trail"
          message="Showing the last known good state while authoritative sources are re-read."
        />
      ) : null}
      {control.kind === "read-only-error" ? (
        <TrailStatusPanel
          title="Trail needs attention"
          message={control.message}
          tone="error"
        />
      ) : null}

      {hasReadableSnapshot ? (
        <>
          <nav className="trail-page-nav" aria-label="Trail pages">
            <button
              aria-current={activePage === "triage" ? "page" : undefined}
              className={activePage === "triage" ? "is-active" : undefined}
              onClick={() => setActivePage("triage")}
              type="button"
            >
              Triage
            </button>
            <button
              aria-current={activePage === "search" ? "page" : undefined}
              className={activePage === "search" ? "is-active" : undefined}
              onClick={() => setActivePage("search")}
              type="button"
            >
              Search
            </button>
            <button
              aria-current={activePage === "projects" ? "page" : undefined}
              className={activePage === "projects" ? "is-active" : undefined}
              onClick={openProjectsRoot}
              type="button"
            >
              Projects
            </button>
            <button
              aria-current={activePage === "cycles" ? "page" : undefined}
              className={activePage === "cycles" ? "is-active" : undefined}
              onClick={() => setActivePage("cycles")}
              type="button"
            >
              Cycles
            </button>
          </nav>

          {activePage === "triage" ? (
            <TrailTriagePage
              actions={props.actions.triage}
              runtimeStore={props.runtimeStore}
              timezone={configuration.temporal.timezone}
              writable={writable}
            />
          ) : activePage === "search" ? (
            <TrailSearchPage
              actions={{ issues: props.actions.issues, triage: props.actions.triage }}
              onOpenInitiative={openInitiative}
              onOpenProject={openProject}
              runtimeStore={props.runtimeStore}
              writable={writable}
            />
          ) : activePage === "projects" ? (
            <TrailProjectsPage
              actions={{
                initiatives: props.actions.initiatives,
                issues: props.actions.issues,
                milestones: props.actions.milestones,
                projects: props.actions.projects,
              }}
              navigationRequest={projectsNavigation}
              runtimeStore={props.runtimeStore}
              writable={writable}
            />
          ) : (
            <TrailCyclesPage
              actions={props.actions.cycles}
              configuration={configuration}
              issueActions={props.actions.issues}
              runtimeStore={props.runtimeStore}
              writable={writable}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
