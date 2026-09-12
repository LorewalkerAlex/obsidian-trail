import { useState, type KeyboardEventHandler } from "react";
import { useStore } from "zustand";

import { selectTrailCyclesIndexReadModel } from "../../query/cycles/trail-cycle-page-query";
import {
  selectTrailSidebarSearchReadModel,
  type TrailSidebarSearchResultReadModel,
} from "../../query/search/trail-search-query";
import { selectTrailReadableDefaultProject } from "../../query/shared/trail-project-target-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TRAIL_DEVELOPMENT_UI_ENABLED } from "../../trail-build-flags";
import { TrailInput } from "../primitives/trail-input";
import {
  trailLocationsEqual,
  type TrailLocation,
  type TrailNavigationStore,
} from "./trail-navigation-state";

type TrailNavigationIconKind =
  | "cycles"
  | "foundation"
  | "home"
  | "project"
  | "projects"
  | "triage";

function TrailNavigationIcon({
  kind,
}: {
  readonly kind: TrailNavigationIconKind;
}) {
  const glyph = (() => {
    switch (kind) {
      case "home":
        return (
          <>
            <path d="M2.75 7.1 8 2.75l5.25 4.35v6.15a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1Z" />
            <path d="M6 14.25V9.5h4v4.75" />
          </>
        );
      case "triage":
        return (
          <>
            <path d="M2.5 3.5h11v9h-3l-1 1.5h-3l-1-1.5h-3Z" />
            <path d="M2.5 9.5h3l1 1.5h3l1-1.5h3" />
          </>
        );
      case "projects":
        return (
          <>
            <rect height="4" rx="1" width="4" x="2.5" y="3" />
            <rect height="4" rx="1" width="4" x="9.5" y="3" />
            <rect height="4" rx="1" width="4" x="2.5" y="9" />
            <rect height="4" rx="1" width="4" x="9.5" y="9" />
          </>
        );
      case "project":
        return (
          <>
            <rect height="10" rx="2" width="10" x="3" y="3" />
            <path d="M6 6h4M6 8.75h4M6 11.5h2.5" />
          </>
        );
      case "cycles":
        return (
          <>
            <path d="M13 5.75A5.5 5.5 0 0 0 3.5 4.1L2.5 5.25" />
            <path d="M2.5 2.75v2.5H5" />
            <path d="M3 10.25a5.5 5.5 0 0 0 9.5 1.65l1-1.15" />
            <path d="M13.5 13.25v-2.5H11" />
          </>
        );
      case "foundation":
        return (
          <>
            <path d="m8 2.5 5.25 3L8 8.5l-5.25-3Z" />
            <path d="m3.25 8 4.75 2.75L12.75 8" />
            <path d="m3.25 10.5 4.75 2.75 4.75-2.75" />
          </>
        );
    }
  })();

  return (
    <svg
      aria-hidden="true"
      className="trail-navigation__row-icon"
      data-trail-navigation-icon={kind}
      fill="none"
      viewBox="0 0 16 16"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      >
        {glyph}
      </g>
    </svg>
  );
}

function TrailNavigationRow({
  active,
  children,
  icon,
  onClick,
}: {
  readonly active: boolean;
  readonly children: string;
  readonly icon: TrailNavigationIconKind;
  readonly onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className="trail-navigation__row"
      onClick={onClick}
      type="button"
    >
      <TrailNavigationIcon kind={icon} />
      <span className="trail-navigation__row-label">{children}</span>
    </button>
  );
}

function searchResultLocation(result: TrailSidebarSearchResultReadModel): TrailLocation {
  switch (result.kind) {
    case "initiative":
      return { initiativeId: result.entityId, kind: "initiative" };
    case "project":
      return { kind: "project", projectId: result.entityId };
    case "workflow-issue":
      return { issueId: result.entityId, kind: "issue" };
  }
}

function TrailSidebarSearch({
  navigationStore,
  onNavigate,
  runtimeStore,
}: {
  readonly navigationStore: TrailNavigationStore;
  readonly onNavigate: (location: TrailLocation) => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const [search, setSearch] = useState("");
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const readModel = selectTrailSidebarSearchReadModel(state, search);
  const groups = [
    { label: "Initiatives", results: readModel.initiatives },
    { label: "Projects", results: readModel.projects },
    { label: "Issues", results: readModel.issues },
  ];
  const hasResults = groups.some(({ results }) => results.length > 0);
  const hasQuery = search.trim().length > 0;

  const closeSearch = () => navigationStore.getState().closeSearch();
  const activateResult = (result: TrailSidebarSearchResultReadModel) => {
    closeSearch();
    onNavigate(searchResultLocation(result));
  };
  const handleKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSearch();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const resultButtons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        ".trail-navigation__search-result",
      ),
    );
    if (resultButtons.length === 0) return;

    const activeElement = document.activeElement;
    const input = event.currentTarget.querySelector<HTMLInputElement>(".trail-input");
    if (activeElement === input) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        resultButtons[0]?.focus();
      }
      return;
    }

    const currentIndex = resultButtons.indexOf(activeElement as HTMLButtonElement);
    if (currentIndex < 0) return;

    event.preventDefault();
    if (event.key === "ArrowDown") {
      resultButtons[Math.min(currentIndex + 1, resultButtons.length - 1)]?.focus();
      return;
    }

    if (currentIndex === 0) input?.focus();
    else resultButtons[currentIndex - 1]?.focus();
  };

  return (
    <section
      aria-label="Trail search"
      className="trail-navigation__search"
      onKeyDown={handleKeyDown}
    >
      <div className="trail-navigation__search-header">
        <button
          className="trail-navigation__search-back"
          onClick={closeSearch}
          type="button"
        >
          Back
        </button>
        <strong>Search</strong>
      </div>
      <div className="trail-navigation__search-input">
        <TrailInput
          aria-label="Search Trail"
          autoFocus
          onChange={(event) => setSearch(event.currentTarget.value)}
          value={search}
        />
      </div>

      {!hasQuery ? null : (
        <div className="trail-navigation__search-results">
          {groups.map((group) => (
            group.results.length === 0 ? null : (
              <section
                aria-label={group.label}
                className="trail-navigation__search-group"
                key={group.label}
              >
                <div className="trail-navigation__section-label">{group.label}</div>
                <div className="trail-navigation__search-group-results">
                  {group.results.map((result) => (
                    <button
                      className="trail-navigation__row trail-navigation__search-result"
                      key={`${result.kind}:${result.entityId}`}
                      onClick={() => activateResult(result)}
                      type="button"
                    >
                      <span className="trail-navigation__row-label">{result.title}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          ))}
          {hasResults ? null : (
            <div className="trail-navigation__search-empty" role="status">
              No results
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function TrailNavigation({
  navigationStore,
  onNavigate,
  runtimeStore,
  showDevelopment = TRAIL_DEVELOPMENT_UI_ENABLED,
}: {
  readonly navigationStore: TrailNavigationStore;
  readonly onNavigate: (location: TrailLocation) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly showDevelopment?: boolean;
}) {
  const location = useStore(navigationStore, (state) => state.location);
  const sidebarMode = useStore(navigationStore, (state) => state.sidebarMode);
  const defaultProject = useStore(runtimeStore, selectTrailReadableDefaultProject);
  const currentCycleId = useStore(runtimeStore, (state) => (
    selectTrailCyclesIndexReadModel(state)?.current?.id
  ));

  if (sidebarMode === "search") {
    return (
      <TrailSidebarSearch
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        runtimeStore={runtimeStore}
      />
    );
  }

  const navigate = (nextLocation: TrailLocation) => {
    onNavigate(nextLocation);
  };

  return (
    <nav aria-label="Trail navigation" className="trail-navigation">
      <div className="trail-navigation__header">
        <div className="trail-navigation__identity">
          <span aria-hidden="true" className="trail-navigation__mark" />
          <strong>Trail</strong>
        </div>
        <button
          className="trail-navigation__search-action"
          onClick={() => navigationStore.getState().openSearch()}
          type="button"
        >
          Search
        </button>
      </div>

      <div className="trail-navigation__primary">
        <TrailNavigationRow
          active={trailLocationsEqual(location, { kind: "home" })}
          icon="home"
          onClick={() => navigate({ kind: "home" })}
        >
          Home
        </TrailNavigationRow>
        <TrailNavigationRow
          active={trailLocationsEqual(location, { kind: "triage" })}
          icon="triage"
          onClick={() => navigate({ kind: "triage" })}
        >
          Triage
        </TrailNavigationRow>
      </div>

      <section aria-label="Workspace" className="trail-navigation__section">
        <div className="trail-navigation__section-label">Workspace</div>
        <TrailNavigationRow
          active={trailLocationsEqual(location, { kind: "projects" })}
          icon="projects"
          onClick={() => navigate({ kind: "projects" })}
        >
          Projects
        </TrailNavigationRow>
        {defaultProject === undefined ? null : (
          <TrailNavigationRow
            active={trailLocationsEqual(location, {
              kind: "project",
              projectId: defaultProject.id,
            })}
            icon="project"
            onClick={() => navigate({
              kind: "project",
              projectId: defaultProject.id,
            })}
          >
            {defaultProject.title}
          </TrailNavigationRow>
        )}
        <TrailNavigationRow
          active={location.kind === "cycles" || location.kind === "cycle"}
          icon="cycles"
          onClick={() => navigate(currentCycleId === undefined
            ? { kind: "cycles" }
            : { cycleId: currentCycleId, kind: "cycle" })}
        >
          Cycles
        </TrailNavigationRow>
      </section>

      {showDevelopment ? (
        <section aria-label="Development" className="trail-navigation__development">
          <div className="trail-navigation__section-label">Development</div>
          <TrailNavigationRow
            active={trailLocationsEqual(location, { kind: "foundation" })}
            icon="foundation"
            onClick={() => navigate({ kind: "foundation" })}
          >
            Foundation
          </TrailNavigationRow>
        </section>
      ) : null}
    </nav>
  );
}
