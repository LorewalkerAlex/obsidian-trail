import { useState } from "react";
import { useStore } from "zustand";

import { selectTrailReadableConfiguration } from "../../query/shared/trail-effective-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailCyclesPage } from "../pages/cycles/trail-cycles-page";
import { TrailProjectsPage } from "../pages/projects/trail-projects-page";
import { TrailTriagePage } from "../pages/triage/trail-triage-page";
import { TrailStatusPanel } from "../patterns/trail-feedback";
import type { TrailUiActions } from "./trail-ui-actions";

type TrailPage = "cycles" | "projects" | "triage";

function pageTitle(page: TrailPage): string {
  switch (page) {
    case "cycles": return "Cycles";
    case "projects": return "Projects";
    case "triage": return "Triage";
  }
}

function pageSubtitle(page: TrailPage): string {
  switch (page) {
    case "cycles":
      return "Choose the work you intend to focus on, close the period explicitly, and carry unfinished work forward only when you want to.";
    case "projects":
      return "Organize outcomes by Initiative, Milestone, and executable Workflow Issues.";
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
  const writable = control.kind === "ready";
  const hasReadableSnapshot = committedRevision > 0 && configuration !== null;

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
              aria-current={activePage === "projects" ? "page" : undefined}
              className={activePage === "projects" ? "is-active" : undefined}
              onClick={() => setActivePage("projects")}
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
          ) : activePage === "projects" ? (
            <TrailProjectsPage
              actions={{
                initiatives: props.actions.initiatives,
                issues: props.actions.issues,
                milestones: props.actions.milestones,
                projects: props.actions.projects,
              }}
              runtimeStore={props.runtimeStore}
              writable={writable}
            />
          ) : (
            <TrailCyclesPage
              actions={props.actions.cycles}
              configuration={configuration}
              runtimeStore={props.runtimeStore}
              writable={writable}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
