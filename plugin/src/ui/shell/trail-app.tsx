import { useStore } from "zustand";

import { selectTrailReadableConfiguration } from "../../query/shared/trail-effective-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailCyclesPage } from "../pages/cycles/trail-cycles-page";
import { TrailHomePage } from "../pages/home/trail-home-page";
import {
  TrailProjectsPage,
  type TrailProjectsNavigationRequest,
} from "../pages/projects/trail-projects-page";
import { TrailSearchPage } from "../pages/search/trail-search-page";
import { TrailTriagePage } from "../pages/triage/trail-triage-page";
import { TrailStatusPanel } from "../patterns/trail-feedback";
import type {
  TrailLocation,
  TrailNavigationStore,
} from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";

type TrailPage = "cycles" | "home" | "projects" | "search" | "triage";

function pageForLocation(location: TrailLocation): TrailPage {
  switch (location.kind) {
    case "cycles": return "cycles";
    case "home": return "home";
    case "initiative":
    case "project":
    case "projects": return "projects";
    case "search": return "search";
    case "triage": return "triage";
  }
}

function pageTitle(page: TrailPage): string {
  switch (page) {
    case "cycles": return "Cycles";
    case "home": return "Home";
    case "projects": return "Projects";
    case "search": return "Search";
    case "triage": return "Triage";
  }
}

function pageSubtitle(page: TrailPage): string {
  switch (page) {
    case "cycles":
      return "Plan the period explicitly, then execute the Current Cycle through the same Workflow Status system.";
    case "home":
      return "See the current Trail context, route into work, and keep the weekly working note close at hand.";
    case "projects":
      return "Organize outcomes by Initiative and Milestone, then execute Issues in List or Board.";
    case "search":
      return "Find current Trail work, inspect Issues in place, or route directly to structural context.";
    case "triage":
      return "Capture now. Decide what it becomes when you are ready.";
  }
}

function projectsNavigationRequest(
  location: TrailLocation,
  requestId: number,
): TrailProjectsNavigationRequest | undefined {
  if (location.kind === "project") {
    return {
      requestId,
      target: { kind: "project", projectId: location.projectId },
    };
  }
  if (location.kind === "initiative") {
    return {
      requestId,
      target: { initiativeId: location.initiativeId, kind: "initiative" },
    };
  }
  return undefined;
}

export function TrailApp(props: {
  readonly actions: TrailUiActions;
  readonly navigationStore: TrailNavigationStore;
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
  const location = useStore(props.navigationStore, (state) => state.location);
  const navigationRequestId = useStore(props.navigationStore, (state) => state.requestId);
  const navigate = useStore(props.navigationStore, (state) => state.navigate);
  const activePage = pageForLocation(location);
  const writable = control.kind === "ready";
  const hasReadableSnapshot = committedRevision > 0 && configuration !== null;

  const openProjectsRoot = (): void => {
    navigate({ kind: "projects" });
  };

  const openProject = (projectId: string): void => {
    navigate({ kind: "project", projectId });
  };

  const openInitiative = (initiativeId: string): void => {
    navigate({ initiativeId, kind: "initiative" });
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
        activePage === "home" ? (
          <TrailHomePage
            actions={props.actions.weeklyNote}
            onOpenCycles={() => navigate({ kind: "cycles" })}
            onOpenProjects={openProjectsRoot}
            runtimeStore={props.runtimeStore}
            timezone={configuration.temporal.timezone}
            writable={writable}
          />
        ) : activePage === "triage" ? (
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
            key={navigationRequestId}
            actions={{
              initiatives: props.actions.initiatives,
              issues: props.actions.issues,
              milestones: props.actions.milestones,
              projects: props.actions.projects,
            }}
            navigationRequest={projectsNavigationRequest(location, navigationRequestId)}
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
        )
      ) : null}
    </div>
  );
}
