import { useState } from "react";
import { useStore } from "zustand";

import { selectTrailReadableConfiguration } from "../../query/shared/trail-effective-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailProjectsPage } from "../pages/projects/trail-projects-page";
import { TrailTriagePage } from "../pages/triage/trail-triage-page";
import { TrailStatusPanel } from "../patterns/trail-feedback";
import type { TrailUiActions } from "./trail-ui-actions";

type TrailPage = "projects" | "triage";

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
          <h1 className="trail-app__title">
            {activePage === "triage" ? "Triage" : "Projects"}
          </h1>
        </div>
        <p className="trail-app__subtitle">
          {activePage === "triage"
            ? "Capture now. Decide what it becomes when you are ready."
            : "Turn planned outcomes into executable Workflow Issues."}
        </p>
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
          </nav>

          {activePage === "triage" ? (
            <TrailTriagePage
              actions={props.actions.triage}
              runtimeStore={props.runtimeStore}
              timezone={configuration.temporal.timezone}
              writable={writable}
            />
          ) : (
            <TrailProjectsPage
              actions={{ issues: props.actions.issues, projects: props.actions.projects }}
              runtimeStore={props.runtimeStore}
              writable={writable}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
