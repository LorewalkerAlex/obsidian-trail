import type { KeyboardEventHandler } from "react";
import { useRef, useState } from "react";
import { useStore } from "zustand";

import { addTrailCalendarDays } from "../../../domain/rules/trail-temporal-rules";
import {
  selectTrailProjectsRootReadModel,
  type TrailProjectTimelineRowReadModel,
  type TrailProjectsRootFilterPropertyId,
  type TrailProjectsRootGroupReadModel,
} from "../../../query/projects/trail-projects-root-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailProjectSummaryRow } from "../../entities/trail-project-summary-row";
import { TrailProjectComposer } from "../../entities/trail-standard-creation-composers";
import { useTrailCollectionFilterState } from "../../interactions/trail-collection-filter-state";
import {
  isTrailCollectionSelectionKeyboardOriginEligible,
  useTrailCollectionSelectionState,
} from "../../interactions/trail-collection-selection-state";
import { TrailEmptyState } from "../../patterns/trail-empty-state";
import { TrailGroupHeader } from "../../patterns/trail-group-header";
import { TrailPageHeader } from "../../patterns/trail-page-header";
import { TrailButton } from "../../primitives/trail-button";
import { TrailIconButton } from "../../primitives/trail-icon-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { useTrailProjectCollectionActions } from "./trail-project-collection-actions";
import { TrailProjectTimeline } from "./trail-project-timeline";
import {
  TrailProjectsViewControls,
  type TrailProjectsRootLayout,
} from "./trail-projects-view-controls";

const TIMELINE_RANGE_PADDING_DAYS = 14;

type TrailProjectsPageActions = Pick<
  TrailUiActions["projects"],
  "createFromDraft"
> & Partial<Pick<
  TrailUiActions["projects"],
  "changeInitiative" | "changeStatus"
>>;

function TrailAddIcon() {
  return (
    <svg aria-hidden="true" className="trail-projects-page__add-icon" viewBox="0 0 16 16">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function groupKey(group: TrailProjectsRootGroupReadModel): string {
  return group.initiative === undefined
    ? "unassigned"
    : "initiative:" + group.initiative.id;
}

function timelineRange(
  rows: readonly TrailProjectTimelineRowReadModel[],
  today: number,
  timezone: string,
): { readonly end: number; readonly start: number } {
  let earliest = today;
  let latest = today;
  const include = (timestamp: number) => {
    earliest = Math.min(earliest, timestamp);
    latest = Math.max(latest, timestamp);
  };

  for (const row of rows) {
    if (row.historicalSpan !== undefined) {
      include(row.historicalSpan.start);
      include(row.historicalSpan.end);
    }
    if (row.futureSpan !== undefined) {
      include(row.futureSpan.start);
      include(row.futureSpan.end);
    }
    for (const marker of row.dueMarkers) include(marker.timestamp);
  }

  return {
    end: addTrailCalendarDays(latest, timezone, TIMELINE_RANGE_PADDING_DAYS),
    start: addTrailCalendarDays(earliest, timezone, -TIMELINE_RANGE_PADDING_DAYS),
  };
}

function TrailProjectsList({
  collapsedGroupKeys,
  groups,
  onGroupExpandedChange,
  onInitiativeActivate,
  onProjectActivate,
  onProjectContextMenu,
  onProjectSelectionChange,
  selectedProjectIds,
  timezone,
}: {
  readonly collapsedGroupKeys: ReadonlySet<string>;
  readonly groups: readonly TrailProjectsRootGroupReadModel[];
  readonly onGroupExpandedChange: (key: string, expanded: boolean) => void;
  readonly onInitiativeActivate: (initiativeId: string) => void;
  readonly onProjectActivate: (projectId: string) => void;
  readonly onProjectContextMenu: ReturnType<typeof useTrailProjectCollectionActions>["onProjectContextMenu"];
  readonly onProjectSelectionChange: (
    projectId: string,
    selected: boolean,
    extendRange: boolean,
  ) => void;
  readonly selectedProjectIds: ReadonlySet<string>;
  readonly timezone: string;
}) {
  return (
    <div className="trail-projects-page__groups">
      {groups.map((group) => {
        const key = groupKey(group);
        const expanded = !collapsedGroupKeys.has(key);
        const initiative = group.initiative;
        const label = initiative?.title ?? "No Initiative";

        return (
          <section
            aria-label={`${label} projects`}
            className="trail-projects-page__group"
            key={key}
          >
            <TrailGroupHeader
              count={group.projects.length}
              expanded={expanded}
              label={label}
              onExpandedChange={(nextExpanded) => {
                onGroupExpandedChange(key, nextExpanded);
              }}
              onIdentityActivate={initiative === undefined
                ? undefined
                : () => onInitiativeActivate(initiative.id)}
            />
            {expanded ? group.projects.map((project) => (
              <TrailProjectSummaryRow
                due={project.due}
                key={project.id}
                onActivate={() => onProjectActivate(project.id)}
                onContextMenu={(event) => onProjectContextMenu(event, project.id)}
                onSelectionChange={(selected, extendRange) => {
                  onProjectSelectionChange(project.id, selected, extendRange);
                }}
                priority={project.priority}
                progress={project.progress}
                selected={selectedProjectIds.has(project.id)}
                statusCategory={project.statusCategory}
                statusLabel={project.statusLabel}
                timezone={timezone}
                title={project.title}
              />
            )) : null}
          </section>
        );
      })}
    </div>
  );
}

function TrailProjectsTimelineProjection({
  onProjectActivate,
  rows,
  timezone,
  today,
}: {
  readonly onProjectActivate: (projectId: string) => void;
  readonly rows: readonly TrailProjectTimelineRowReadModel[];
  readonly timezone: string;
  readonly today: number;
}) {
  const range = timelineRange(rows, today, timezone);
  return (
    <div className="trail-projects-page__timeline">
      <TrailProjectTimeline
        label="Projects timeline"
        onProjectActivate={onProjectActivate}
        rangeEnd={range.end}
        rangeStart={range.start}
        rows={rows}
        timezone={timezone}
        today={today}
      />
    </div>
  );
}

export function TrailProjectsPage({
  actions,
  onInitiativeActivate,
  onProjectActivate,
  runtimeStore,
}: {
  readonly actions: TrailProjectsPageActions;
  readonly onInitiativeActivate: (initiativeId: string) => void;
  readonly onProjectActivate: (projectId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const pageRef = useRef<HTMLElement | null>(null);
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const filters = useTrailCollectionFilterState<TrailProjectsRootFilterPropertyId>();
  const [layout, setLayout] = useState<TrailProjectsRootLayout>("list");
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [composerReferenceTimestamp, setComposerReferenceTimestamp] = useState<number | null>(null);
  const now = Date.now();
  const readModel = selectTrailProjectsRootReadModel(state, {
    filter: filters.state,
    now,
  });
  const visibleProjectIds = readModel === null || layout !== "list"
    ? []
    : readModel.groups.flatMap((group) => (
        collapsedGroupKeys.has(groupKey(group))
          ? []
          : group.projects.map((project) => project.id)
      ));
  const selection = useTrailCollectionSelectionState(visibleProjectIds);
  const writable = readModel !== null && state.control.kind === "ready";
  const mutationActions = actions.changeInitiative === undefined || actions.changeStatus === undefined
    ? undefined
    : {
        changeInitiative: actions.changeInitiative,
        changeStatus: actions.changeStatus,
      };
  const clearSelection = () => {
    pageRef.current?.focus({ preventScroll: true });
    selection.clear();
  };
  const collectionActions = useTrailProjectCollectionActions({
    actions: mutationActions,
    clearSelection,
    runtimeStore,
    selectedProjectIds: selection.selectedIds,
  });

  const openComposer = () => {
    if (!writable) return;
    setComposerReferenceTimestamp(Date.now());
  };

  const updateGroupExpanded = (key: string, expanded: boolean) => {
    setCollapsedGroupKeys((current) => {
      const next = new Set(current);
      if (expanded) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectionKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    if (
      event.defaultPrevented
      || event.key !== "Escape"
      || selection.selectedIds.size === 0
      || composerReferenceTimestamp !== null
      || !isTrailCollectionSelectionKeyboardOriginEligible(event.target)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    clearSelection();
  };

  return (
    <section
      aria-label="Projects"
      className="trail-projects-page"
      onKeyDown={handleSelectionKeyDown}
      ref={pageRef}
      tabIndex={-1}
    >
      <div className="trail-projects-page__scroll">
        <TrailPageHeader
          actions={(
            <TrailIconButton
              disabled={!writable}
              icon={<TrailAddIcon />}
              label="Add project"
              onClick={openComposer}
            />
          )}
          title="Projects"
        />

        {readModel === null ? null : (
          <>
            <TrailProjectsViewControls
              configuration={readModel.configuration}
              filter={filters.state}
              initiatives={readModel.initiatives}
              layout={layout}
              onClearAllFilters={filters.clearAll}
              onClearFilterClause={filters.clearClause}
              onLayoutChange={setLayout}
              onSetDueFilter={filters.setDueValue}
              onToggleDiscreteFilter={filters.toggleDiscreteValue}
            />

            <div className="trail-projects-page__content">
              {readModel.emptyKind === "true" ? (
                <TrailEmptyState
                  action={(
                    <TrailButton disabled={!writable} onClick={openComposer} variant="primary">
                      New project
                    </TrailButton>
                  )}
                  description="Create a project to collect durable work under a shared outcome."
                  title="No projects yet"
                />
              ) : readModel.emptyKind === "filtered" ? (
                <TrailEmptyState
                  action={<TrailButton onClick={filters.clearAll}>Clear filters</TrailButton>}
                  title="No projects match the filters."
                />
              ) : readModel.emptyKind === "projection" ? (
                <TrailEmptyState
                  description="Completed and canceled projects are hidden by default. Use the Status filter to include them."
                  title="No active projects"
                />
              ) : layout === "list" ? (
                <TrailProjectsList
                  collapsedGroupKeys={collapsedGroupKeys}
                  groups={readModel.groups}
                  onGroupExpandedChange={updateGroupExpanded}
                  onInitiativeActivate={onInitiativeActivate}
                  onProjectActivate={onProjectActivate}
                  onProjectContextMenu={collectionActions.onProjectContextMenu}
                  onProjectSelectionChange={selection.setSelected}
                  selectedProjectIds={selection.selectedIds}
                  timezone={readModel.configuration.temporal.timezone}
                />
              ) : readModel.timeline.projectionEmpty ? (
                <TrailEmptyState
                  description="Timeline appears when the current Project collection has activity, lifecycle, or eligible Due evidence."
                  title="No timeline evidence for these projects"
                />
              ) : (
                <TrailProjectsTimelineProjection
                  onProjectActivate={onProjectActivate}
                  rows={readModel.timeline.rows}
                  timezone={readModel.configuration.temporal.timezone}
                  today={now}
                />
              )}
            </div>
          </>
        )}
      </div>

      {layout !== "list" || collectionActions.bulkBar === null ? null : (
        <div className="trail-projects-page__bulk-layer">
          {collectionActions.bulkBar}
        </div>
      )}

      {composerReferenceTimestamp === null || readModel === null ? null : (
        <TrailProjectComposer
          configuration={readModel.configuration}
          initiatives={readModel.initiatives}
          onCreate={async (input) => {
            const receipt = actions.createFromDraft(input);
            await receipt.completion;
          }}
          onOpenChange={(open) => {
            if (!open) setComposerReferenceTimestamp(null);
          }}
          open
          referenceTimestamp={composerReferenceTimestamp}
          seedTitle=""
        />
      )}
    </section>
  );
}
