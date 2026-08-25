import { useStore } from "zustand";

import { selectTrailReadableDefaultProject } from "../../query/shared/trail-project-target-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type {
  TrailLocation,
  TrailNavigationStore,
} from "./trail-navigation-state";

function current(location: TrailLocation, kind: TrailLocation["kind"]): "page" | undefined {
  return location.kind === kind ? "page" : undefined;
}

function projectsCurrent(
  location: TrailLocation,
  defaultProjectId: string | undefined,
): "page" | undefined {
  if (location.kind === "projects" || location.kind === "initiative") return "page";
  if (location.kind !== "project") return undefined;
  return location.projectId === defaultProjectId ? undefined : "page";
}

export function TrailNavigation(props: {
  readonly navigationStore: TrailNavigationStore;
  readonly onNavigate: (location: TrailLocation) => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const location = useStore(props.navigationStore, (state) => state.location);
  const defaultProject = useStore(props.runtimeStore, selectTrailReadableDefaultProject);
  const defaultProjectId = defaultProject?.id;

  return (
    <nav aria-label="Trail navigation" className="nav-files-container">
      <div className="nav-header">
        <div className="nav-buttons-container">
          <button
            aria-current={current(location, "search")}
            aria-label="Search"
            className="clickable-icon nav-action-button"
            onClick={() => props.onNavigate({ kind: "search" })}
            type="button"
          >
            Search
          </button>
          <button
            aria-label="Capture"
            className="clickable-icon nav-action-button"
            onClick={() => props.onNavigate({ kind: "triage" })}
            type="button"
          >
            Capture
          </button>
        </div>
      </div>

      <div className="tree-item">
        <button
          aria-current={current(location, "home")}
          className={`tree-item-self nav-file-title${location.kind === "home" ? " is-active" : ""}`}
          onClick={() => props.onNavigate({ kind: "home" })}
          type="button"
        >
          <span className="tree-item-inner">Home</span>
        </button>
      </div>
      <div className="tree-item">
        <button
          aria-current={current(location, "triage")}
          className={`tree-item-self nav-file-title${location.kind === "triage" ? " is-active" : ""}`}
          onClick={() => props.onNavigate({ kind: "triage" })}
          type="button"
        >
          <span className="tree-item-inner">Triage</span>
        </button>
      </div>

      <div className="tree-item nav-folder">
        <div className="tree-item-self nav-folder-title">
          <span className="tree-item-inner nav-folder-title-content">Workspace</span>
        </div>
      </div>

      {defaultProject === undefined ? null : (
        <div className="tree-item">
          <button
            aria-current={
              location.kind === "project" && location.projectId === defaultProject.id
                ? "page"
                : undefined
            }
            className={`tree-item-self nav-file-title${
              location.kind === "project" && location.projectId === defaultProject.id
                ? " is-active"
                : ""
            }`}
            onClick={() => props.onNavigate({
              kind: "project",
              projectId: defaultProject.id,
            })}
            type="button"
          >
            <span className="tree-item-inner">{defaultProject.title}</span>
          </button>
        </div>
      )}

      <div className="tree-item">
        <button
          aria-current={projectsCurrent(location, defaultProjectId)}
          className={`tree-item-self nav-file-title${
            projectsCurrent(location, defaultProjectId) === "page" ? " is-active" : ""
          }`}
          onClick={() => props.onNavigate({ kind: "projects" })}
          type="button"
        >
          <span className="tree-item-inner">Projects</span>
        </button>
      </div>
      <div className="tree-item">
        <button
          aria-current={current(location, "cycles")}
          className={`tree-item-self nav-file-title${location.kind === "cycles" ? " is-active" : ""}`}
          onClick={() => props.onNavigate({ kind: "cycles" })}
          type="button"
        >
          <span className="tree-item-inner">Cycles</span>
        </button>
      </div>
    </nav>
  );
}
