import { useState } from "react";
import { useStore } from "zustand";

import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import {
  TrailProjectsPage,
  type TrailProjectsPageActions,
} from "../pages/projects/trail-projects-page";
import {
  TrailTriagePage,
  type TrailTriagePageActions,
} from "../pages/triage/trail-triage-page";
import { TrailStatusPanel } from "../patterns/trail-feedback";

export interface TrailAppProps
  extends TrailTriagePageActions,
    TrailProjectsPageActions {
  readonly runtimeStore: TrailRuntimeStore;
}

type TrailPage = "projects" | "triage";

export function TrailApp({
  onAccept,
  onCapture,
  onCreateProject,
  onCreateWorkflowIssue,
  onDefer,
  onDelete,
  onEdit,
  onWorkflowStatusChange,
  runtimeStore,
}: TrailAppProps) {
  const availability = useStore(
    runtimeStore,
    (state) => state.availability,
  );
  const [activePage, setActivePage] = useState<TrailPage>("triage");

  return (
    <div className="trail-app">
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

      {availability.kind === "ready" ? (
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
      ) : null}

      {availability.kind === "idle" || availability.kind === "initializing" ? (
        <TrailStatusPanel
          title="Loading Trail"
          message="Validating the Formal workspace and rebuilding runtime state."
        />
      ) : null}

      {availability.kind === "blocked" ? (
        <TrailStatusPanel
          title="Trail needs attention"
          message={availability.message}
          tone="warning"
        />
      ) : null}

      {availability.kind === "error" ? (
        <TrailStatusPanel
          title="Trail could not start"
          message={availability.message}
          tone="error"
        />
      ) : null}

      {availability.kind === "ready" && activePage === "triage" ? (
        <TrailTriagePage
          onAccept={onAccept}
          onCapture={onCapture}
          onDefer={onDefer}
          onDelete={onDelete}
          onEdit={onEdit}
          runtimeStore={runtimeStore}
          timezone={availability.timezone}
        />
      ) : null}

      {availability.kind === "ready" && activePage === "projects" ? (
        <TrailProjectsPage
          onCreateProject={onCreateProject}
          onCreateWorkflowIssue={onCreateWorkflowIssue}
          onWorkflowStatusChange={onWorkflowStatusChange}
          runtimeStore={runtimeStore}
        />
      ) : null}
    </div>
  );
}
