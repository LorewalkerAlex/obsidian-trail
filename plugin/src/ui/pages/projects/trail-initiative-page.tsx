import type { KeyboardEventHandler } from "react";
import { useRef, useState } from "react";
import { useStore } from "zustand";

import {
  selectTrailInitiativeFocusReadModel,
  type TrailInitiativeFocusFilterPropertyId,
} from "../../../query/projects/trail-initiative-focus-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailEntityIdentityEditor } from "../../entities/trail-entity-identity-editor";
import { TrailProjectSummaryRow } from "../../entities/trail-project-summary-row";
import { TrailProjectComposer } from "../../entities/trail-standard-creation-composers";
import { useTrailCollectionFilterState } from "../../interactions/trail-collection-filter-state";
import {
  isTrailCollectionSelectionKeyboardOriginEligible,
  useTrailCollectionSelectionState,
} from "../../interactions/trail-collection-selection-state";
import { TrailEmptyState } from "../../patterns/trail-empty-state";
import {
  TrailPageNarrative,
  type TrailMarkdownRender,
} from "../../patterns/trail-page-narrative";
import {
  TrailPageBreadcrumbButton,
  TrailPageHeader,
} from "../../patterns/trail-page-header";
import { TrailButton } from "../../primitives/trail-button";
import { TrailIconButton } from "../../primitives/trail-icon-button";
import {
  bindTrailProjectCollectionActions,
  type TrailUiActions,
} from "../../shell/trail-ui-actions";
import { useTrailProjectCollectionActions } from "./trail-project-collection-actions";
import { TrailInitiativeActions } from "./trail-initiative-actions";
import { TrailInitiativeViewControls } from "./trail-projects-view-controls";

type TrailInitiativePageActions = Pick<
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

export function TrailInitiativePage({
  actions,
  initiativeActions,
  initiativeId,
  onInitiativeDeleted,
  onProjectActivate,
  onProjectsActivate,
  renderMarkdown,
  runtimeStore,
}: {
  readonly actions: TrailInitiativePageActions;
  readonly initiativeActions?: Pick<TrailUiActions["initiatives"], "delete" | "editProperties">;
  readonly initiativeId: string;
  readonly onInitiativeDeleted?: () => void;
  readonly onProjectActivate: (projectId: string) => void;
  readonly onProjectsActivate: () => void;
  readonly renderMarkdown: TrailMarkdownRender;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const pageRef = useRef<HTMLElement | null>(null);
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const filters = useTrailCollectionFilterState<TrailInitiativeFocusFilterPropertyId>();
  const [composerReferenceTimestamp, setComposerReferenceTimestamp] = useState<number | null>(null);
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const now = Date.now();
  const readModel = selectTrailInitiativeFocusReadModel(state, {
    filter: filters.state,
    initiativeId,
    now,
  });
  const visibleProjectIds = readModel?.projects.map((project) => project.id) ?? [];
  const selection = useTrailCollectionSelectionState(visibleProjectIds);
  const writable = readModel !== null && state.control.kind === "ready";
  const mutationActions = bindTrailProjectCollectionActions(actions);
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

  if (readModel === null) {
    return (
      <section
        aria-label="Initiative"
        className="trail-initiative-page"
        ref={pageRef}
        tabIndex={-1}
      />
    );
  }

  const description = readModel.initiative.description;

  return (
    <section
      aria-label={`${readModel.initiative.title} initiative`}
      className="trail-initiative-page"
      onKeyDown={handleSelectionKeyDown}
      ref={pageRef}
      tabIndex={-1}
    >
      <div className="trail-initiative-page__scroll">
        <TrailPageHeader
          actions={(
            <>
              <TrailIconButton
                disabled={!writable}
                icon={<TrailAddIcon />}
                label="Add project"
                onClick={openComposer}
              />
              {initiativeActions === undefined || onInitiativeDeleted === undefined ? null : <TrailInitiativeActions
                actions={initiativeActions}
                expectedInitiative={readModel.expectedInitiative}
                onDeleted={onInitiativeDeleted}
                onEdit={() => setIdentityEditorOpen(true)}
                projectCount={readModel.projectCount}
                writable={writable}
              />}
            </>
          )}
          breadcrumb={(
            <TrailPageBreadcrumbButton onClick={onProjectsActivate}>
              Projects
            </TrailPageBreadcrumbButton>
          )}
          title={readModel.initiative.title}
        />

        {description === undefined || description.trim().length === 0 ? null : (
          <TrailPageNarrative
            markdown={description}
            renderMarkdown={renderMarkdown}
          />
        )}

        <TrailInitiativeViewControls
          configuration={readModel.configuration}
          filter={filters.state}
          onClearAllFilters={filters.clearAll}
          onClearFilterClause={filters.clearClause}
          onSetDueFilter={filters.setDueValue}
          onToggleDiscreteFilter={filters.toggleDiscreteValue}
        />

        <div className="trail-initiative-page__content">
          {readModel.emptyKind === "true" ? (
            <TrailEmptyState
              action={(
                <TrailButton disabled={!writable} onClick={openComposer} variant="primary">
                  New project
                </TrailButton>
              )}
              description="Create a project in this initiative to organize work toward its outcome."
              title="No projects in this initiative yet"
            />
          ) : readModel.emptyKind === "filtered" ? (
            <TrailEmptyState
              action={<TrailButton onClick={filters.clearAll}>Clear filters</TrailButton>}
              title="No projects match the filters."
            />
          ) : (
            <div className="trail-initiative-page__projects">
              {readModel.projects.map((project) => (
                <TrailProjectSummaryRow
                  due={project.due}
                  key={project.id}
                  labels={project.labels}
                  onActivate={() => onProjectActivate(project.id)}
                  onContextMenu={(event) => collectionActions.onProjectContextMenu(event, project.id)}
                  onSelectionChange={(selected, extendRange) => {
                    selection.setSelected(project.id, selected, extendRange);
                  }}
                  priority={project.priority}
                  progress={project.progress}
                  selected={selection.selectedIds.has(project.id)}
                  statusCategory={project.statusCategory}
                  statusLabel={project.statusLabel}
                  timezone={readModel.configuration.temporal.timezone}
                  title={project.title}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {collectionActions.bulkBar === null ? null : (
        <div className="trail-initiative-page__bulk-layer">
          {collectionActions.bulkBar}
        </div>
      )}

      {composerReferenceTimestamp === null ? null : (
        <TrailProjectComposer
          configuration={readModel.configuration}
          initialInitiativeId={readModel.initiative.id}
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

      {initiativeActions === undefined ? null : <TrailEntityIdentityEditor
        context="Initiative"
        description={readModel.initiative.description}
        onOpenChange={setIdentityEditorOpen}
        onSave={async (draft) => {
          const latest = selectTrailInitiativeFocusReadModel(runtimeStore.getState(), {
            filter: filters.state,
            initiativeId,
            now: Date.now(),
          });
          if (latest === null) throw new Error("This initiative is no longer available.");
          const expected = latest.expectedInitiative;
          const result = initiativeActions.editProperties(expected, {
            description: draft.description,
            due: expected.due,
            labelIds: expected.labelIds,
            priority: expected.priority,
            title: draft.title,
          });
          if (result.kind === "needs-input") throw new Error(result.input.message);
          if (result.kind === "submitted") await result.receipt.completion;
        }}
        open={identityEditorOpen}
        title={readModel.initiative.title}
      />}
    </section>
  );
}
