import type {
  KeyboardEventHandler,
  PointerEventHandler,
} from "react";
import { useState } from "react";
import { useStore } from "zustand";

import {
  selectTrailProjectWorkspaceReadModel,
  type TrailProjectWorkspaceFilterPropertyId,
  type TrailProjectWorkspaceStatusSectionReadModel,
} from "../../../query/projects/trail-project-workspace-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailWorkflowIssueComposer } from "../../entities/trail-standard-creation-composers";
import { TrailWorkflowIssueRow } from "../../entities/trail-workflow-issue-row";
import { useTrailCollectionFilterState } from "../../interactions/trail-collection-filter-state";
import {
  getAdjacentTrailIssueId,
  isTrailIssuePeekKeyboardOriginEligible,
  useTrailIssuePeek,
} from "../../interactions/trail-issue-peek-state";
import { TrailEmptyState } from "../../patterns/trail-empty-state";
import { TrailGroupHeader } from "../../patterns/trail-group-header";
import { TrailIssuePeek } from "../../patterns/trail-issue-peek";
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
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailProjectWorkspaceViewControls } from "./trail-project-workspace-view-controls";

type TrailProjectWorkspacePageActions = Pick<
  TrailUiActions["issues"],
  "createFromDraft"
>;

function TrailAddIcon() {
  return (
    <svg aria-hidden="true" className="trail-projects-page__add-icon" viewBox="0 0 16 16">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function TrailBreadcrumbSeparator() {
  return <span aria-hidden="true" className="trail-page-header__breadcrumb-separator">/</span>;
}

function TrailProjectStatusSection({
  collapsed,
  onExpandedChange,
  onIssuePeekOpen,
  onIssuePeekToggle,
  peekTargetId,
  section,
  timezone,
}: {
  readonly collapsed: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
  readonly onIssuePeekOpen: (issueId: string) => void;
  readonly onIssuePeekToggle: (issueId: string) => void;
  readonly peekTargetId: string | null;
  readonly section: TrailProjectWorkspaceStatusSectionReadModel;
  readonly timezone: string;
}) {
  return (
    <section
      aria-label={`${section.label} issues`}
      className="trail-project-workspace-page__status-section"
      data-empty={section.issues.length === 0 ? "true" : undefined}
    >
      <TrailGroupHeader
        count={section.issues.length}
        expanded={!collapsed}
        label={section.label}
        onExpandedChange={onExpandedChange}
      />
      {collapsed ? null : section.issues.map((issue) => (
        <TrailWorkflowIssueRow
          due={issue.due}
          estimate={issue.estimate}
          highlighted={peekTargetId === issue.id}
          inCurrentCycle={issue.inCurrentCycle}
          issueId={issue.id}
          key={issue.id}
          labels={issue.labels}
          milestoneTitle={issue.milestone?.title}
          onActivate={() => onIssuePeekOpen(issue.id)}
          onPreviewToggle={() => onIssuePeekToggle(issue.id)}
          priority={issue.priority}
          timezone={timezone}
          title={issue.title}
        />
      ))}
    </section>
  );
}

export function TrailProjectWorkspacePage({
  actions,
  onInitiativeActivate,
  onProjectsActivate,
  projectId,
  renderMarkdown,
  runtimeStore,
}: {
  readonly actions: TrailProjectWorkspacePageActions;
  readonly onInitiativeActivate: (initiativeId: string) => void;
  readonly onProjectsActivate: () => void;
  readonly projectId: string;
  readonly renderMarkdown: TrailMarkdownRender;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const filters = useTrailCollectionFilterState<TrailProjectWorkspaceFilterPropertyId>();
  const [collapsedStatusIds, setCollapsedStatusIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [composerReferenceTimestamp, setComposerReferenceTimestamp] = useState<number | null>(null);
  const now = Date.now();
  const readModel = selectTrailProjectWorkspaceReadModel(state, {
    filter: filters.state,
    now,
    projectId,
  });
  const peekVisibleIssueIds = readModel === null
    ? []
    : readModel.sections.flatMap((section) => (
        collapsedStatusIds.has(section.id)
          ? []
          : section.issues.map((issue) => issue.id)
      ));
  const peek = useTrailIssuePeek(peekVisibleIssueIds);
  const peekIssue = peek.targetId === null || readModel === null
    ? undefined
    : readModel.sections
        .flatMap((section) => section.issues)
        .find((issue) => issue.id === peek.targetId && peekVisibleIssueIds.includes(issue.id));
  const writable = readModel !== null && state.control.kind === "ready";
  const canCreateIssue = writable && readModel.canCreateIssue;

  const openComposer = () => {
    if (!canCreateIssue) return;
    setComposerReferenceTimestamp(Date.now());
  };

  const updateSectionExpanded = (statusId: string, expanded: boolean) => {
    setCollapsedStatusIds((current) => {
      const next = new Set(current);
      if (expanded) next.delete(statusId);
      else next.add(statusId);
      return next;
    });
  };

  const handlePointerDownCapture: PointerEventHandler<HTMLElement> = (event) => {
    if (peek.targetId === null || !(event.target instanceof Element)) return;
    if (event.target.closest(".trail-issue-peek") !== null) return;
    if (event.target.closest("[data-workflow-issue-row='true']") !== null) return;
    peek.close();
  };

  const handleKeyDownCapture: KeyboardEventHandler<HTMLElement> = (event) => {
    if (peek.targetId === null || composerReferenceTimestamp !== null) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      peek.close();
      return;
    }
    if (!isTrailIssuePeekKeyboardOriginEligible(event.target)) return;
    if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      peek.close();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const nextIssueId = getAdjacentTrailIssueId(
        peekVisibleIssueIds,
        peek.targetId,
        event.key === "ArrowDown" ? "next" : "previous",
      );
      event.preventDefault();
      event.stopPropagation();
      if (nextIssueId === null) return;
      peek.open(nextIssueId);
      const rows = event.currentTarget.querySelectorAll<HTMLElement>(
        "[data-workflow-issue-id]",
      );
      for (const row of rows) {
        if (row.dataset.workflowIssueId === nextIssueId) {
          row.focus({ preventScroll: true });
          break;
        }
      }
    }
  };

  if (readModel === null) {
    return <section aria-label="Project" className="trail-project-workspace-page" />;
  }

  const description = readModel.project.description;
  const initiative = readModel.initiative;
  const addIssueTitle = readModel.canCreateIssue
    ? "Add issue"
    : `Reopen this ${readModel.project.statusLabel} project before adding new work`;

  return (
    <section
      aria-label={`${readModel.project.title} project`}
      className="trail-project-workspace-page"
      data-project-status-category={readModel.project.statusCategory}
      onKeyDownCapture={handleKeyDownCapture}
      onPointerDownCapture={handlePointerDownCapture}
    >
      <div className="trail-project-workspace-page__scroll">
        <TrailPageHeader
          actions={(
            <TrailIconButton
              disabled={!canCreateIssue}
              icon={<TrailAddIcon />}
              label="Add issue"
              onClick={openComposer}
              title={addIssueTitle}
            />
          )}
          breadcrumb={(
            <>
              <TrailPageBreadcrumbButton onClick={onProjectsActivate}>
                Projects
              </TrailPageBreadcrumbButton>
              {initiative === undefined ? null : (
                <>
                  <TrailBreadcrumbSeparator />
                  <TrailPageBreadcrumbButton
                    onClick={() => onInitiativeActivate(initiative.id)}
                  >
                    {initiative.title}
                  </TrailPageBreadcrumbButton>
                </>
              )}
            </>
          )}
          title={readModel.project.title}
        />

        {description === undefined || description.trim().length === 0 ? null : (
          <TrailPageNarrative markdown={description} renderMarkdown={renderMarkdown} />
        )}

        <TrailProjectWorkspaceViewControls
          configuration={readModel.configuration}
          filter={filters.state}
          milestones={readModel.milestones}
          onClearAllFilters={filters.clearAll}
          onClearFilterClause={filters.clearClause}
          onSetDueFilter={filters.setDueValue}
          onToggleDiscreteFilter={filters.toggleDiscreteValue}
        />

        <div className="trail-project-workspace-page__content">
          <div className="trail-project-workspace-page__sections">
            {readModel.sections.map((section) => (
              <TrailProjectStatusSection
                collapsed={collapsedStatusIds.has(section.id)}
                key={section.id}
                onExpandedChange={(expanded) => updateSectionExpanded(section.id, expanded)}
                onIssuePeekOpen={peek.open}
                onIssuePeekToggle={peek.toggle}
                peekTargetId={peek.targetId}
                section={section}
                timezone={readModel.configuration.temporal.timezone}
              />
            ))}
          </div>

          {readModel.emptyKind === "true" ? (
            <TrailEmptyState
              action={canCreateIssue ? (
                <TrailButton onClick={openComposer} variant="primary">New issue</TrailButton>
              ) : undefined}
              description={readModel.canCreateIssue
                ? "Create a Backlog issue to begin planning work in this project."
                : "Reopen this project before adding new non-terminal work."}
              title="No issues in this project yet"
            />
          ) : readModel.emptyKind === "filtered" ? (
            <TrailEmptyState
              action={<TrailButton onClick={filters.clearAll}>Clear filters</TrailButton>}
              title="No issues match the filters."
            />
          ) : null}
        </div>
      </div>

      {peekIssue === undefined ? null : (
        <div className="trail-project-workspace-page__peek-layer">
          <TrailIssuePeek
            issue={peekIssue}
            renderMarkdown={renderMarkdown}
            showProject={false}
            timezone={readModel.configuration.temporal.timezone}
          />
        </div>
      )}

      {composerReferenceTimestamp === null ? null : (
        <TrailWorkflowIssueComposer
          configuration={readModel.configuration}
          initialProjectId={readModel.project.id}
          onCreate={async (input) => {
            const receipt = actions.createFromDraft(input);
            await receipt.completion;
          }}
          onOpenChange={(open) => {
            if (!open) setComposerReferenceTimestamp(null);
          }}
          open
          projects={readModel.creationTargets}
          referenceTimestamp={composerReferenceTimestamp}
          seedTitle=""
        />
      )}
    </section>
  );
}
