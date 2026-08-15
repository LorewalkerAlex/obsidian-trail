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
  const control = useStore(
    runtimeStore,
    (state) => state.control,
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

      {control.kind === "ready" ? (
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

      {control.kind === "loading" ? (
        <TrailStatusPanel
          title="Loading Trail"
          message="Validating the Formal workspace and rebuilding runtime state."
        />
      ) : null}

      {control.kind === "refreshing" ? (
        <TrailStatusPanel
          title="Refreshing Trail"
          message="Re-reading authoritative sources before Trail accepts more changes."
        />
      ) : null}

      {control.kind === "read-only-error" ? (
        <TrailStatusPanel
          title="Trail needs attention"
          message={control.message}
          tone="error"
        />
      ) : null}

      {control.kind === "ready" && activePage === "triage" ? (
        <TrailTriagePage
          onAccept={onAccept}
          onCapture={onCapture}
          onDefer={onDefer}
          onDelete={onDelete}
          onEdit={onEdit}
          runtimeStore={runtimeStore}
          timezone={control.timezone}
        />
      ) : null}

      {control.kind === "ready" && activePage === "projects" ? (
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
