import type {
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
} from "react";
import { useRef, useState } from "react";
import { useStore } from "zustand";

import {
  selectTrailProjectWorkspaceReadModel,
  type TrailProjectWorkspaceFilterPropertyId,
  type TrailProjectWorkspaceStatusSectionReadModel,
} from "../../../query/projects/trail-project-workspace-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailWorkflowIssueComposer } from "../../entities/trail-standard-creation-composers";
import { TrailWorkflowIssueRow } from "../../entities/trail-workflow-issue-row";
import { useTrailActionMenuPresenter } from "../../interactions/trail-action-menu-context";
import { useTrailCollectionFilterState } from "../../interactions/trail-collection-filter-state";
import {
  isTrailCollectionSelectionKeyboardOriginEligible,
  useTrailCollectionSelectionState,
} from "../../interactions/trail-collection-selection-state";
import {
  executeTrailWorkflowIssueAction,
  resolveTrailWorkflowIssueBulkActionScope,
  resolveTrailWorkflowIssueActionContext,
  resolveTrailWorkflowIssueActionScope,
  type TrailWorkflowIssueActionContext,
  type TrailWorkflowIssueActionId,
} from "../../interactions/trail-workflow-issue-action-registry";
import {
  getAdjacentTrailIssueId,
  isTrailIssuePeekKeyboardOriginEligible,
  useTrailIssuePeek,
} from "../../interactions/trail-issue-peek-state";
import { TrailBulkBar } from "../../patterns/trail-bulk-bar";
import { TrailConfirmation } from "../../patterns/trail-confirmation";
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
  "changeStatus" | "createFromDraft" | "delete" | "moveToProject"
>;

function TrailAddIcon() {
  return (
    <svg aria-hidden="true" className="trail-projects-page__add-icon" viewBox="0 0 16 16">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function TrailMoreIcon() {
  return (
    <svg aria-hidden="true" className="trail-action-overflow-icon" viewBox="0 0 16 16">
      <circle cx="3.5" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="12.5" cy="8" r="1" />
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
  onIssueSelectionChange,
  peekTargetId,
  section,
  selectedIssueIds,
  timezone,
}: {
  readonly collapsed: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
  readonly onIssuePeekOpen: (issueId: string) => void;
  readonly onIssuePeekToggle: (issueId: string) => void;
  readonly onIssueSelectionChange: (
    issueId: string,
    selected: boolean,
    extendRange: boolean,
  ) => void;
  readonly peekTargetId: string | null;
  readonly section: TrailProjectWorkspaceStatusSectionReadModel;
  readonly selectedIssueIds: ReadonlySet<string>;
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
          onSelectionChange={(selected, extendRange) => {
            onIssueSelectionChange(issue.id, selected, extendRange);
          }}
          priority={issue.priority}
          selected={selectedIssueIds.has(issue.id)}
          statusCategory={issue.status.category}
          statusLabel={issue.status.label}
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
  const actionMenu = useTrailActionMenuPresenter();
  const filters = useTrailCollectionFilterState<TrailProjectWorkspaceFilterPropertyId>();
  const [collapsedStatusIds, setCollapsedStatusIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [composerReferenceTimestamp, setComposerReferenceTimestamp] = useState<number | null>(null);
  const [deleteContext, setDeleteContext] = useState<TrailWorkflowIssueActionContext | null>(null);
  const deleteReturnFocusRef = useRef<HTMLElement | null>(null);
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
  const selection = useTrailCollectionSelectionState(peekVisibleIssueIds);
  const peekIssue = peek.targetId === null || readModel === null
    ? undefined
    : readModel.sections
        .flatMap((section) => section.issues)
        .find((issue) => issue.id === peek.targetId && peekVisibleIssueIds.includes(issue.id));
  const peekActionContext = peekIssue === undefined
    ? null
    : resolveTrailWorkflowIssueActionContext(
        state,
        resolveTrailWorkflowIssueActionScope({
          invokedIssueId: peekIssue.id,
          selectedIssueIds: selection.selectedIds,
          source: "explicit",
        }),
      );
  const bulkActionContext = selection.selectedIds.size === 0
    ? null
    : resolveTrailWorkflowIssueActionContext(
        state,
        resolveTrailWorkflowIssueBulkActionScope(selection.selectedIds),
      );
  const bulkCancelAction = bulkActionContext?.actions.find(
    ({ id }) => id === "issue.cancel",
  );
  const bulkOverflowActions = bulkActionContext?.actions.filter(
    ({ id }) => id !== "issue.cancel",
  ) ?? [];
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

  const selectAction = (
    context: TrailWorkflowIssueActionContext,
    actionId: TrailWorkflowIssueActionId,
    targetId?: string,
    returnFocusTarget?: HTMLElement | null,
  ): void | Promise<void> => {
    if (actionId === "issue.delete") {
      deleteReturnFocusRef.current = returnFocusTarget ?? null;
      setDeleteContext(context);
      return;
    }
    return executeTrailWorkflowIssueAction(actions, context, actionId, targetId);
  };

  const executeDirectAction = (
    context: TrailWorkflowIssueActionContext,
    actionId: TrailWorkflowIssueActionId,
    targetId?: string,
  ): void => {
    void executeTrailWorkflowIssueAction(actions, context, actionId, targetId)
      .catch(() => undefined);
  };

  const handlePointerDownCapture: PointerEventHandler<HTMLElement> = (event) => {
    if (
      deleteContext !== null
      || peek.targetId === null
      || !(event.target instanceof Element)
    ) return;
    if (event.target.closest(".trail-issue-peek") !== null) return;
    if (event.target.closest("[data-workflow-issue-row='true']") !== null) return;
    peek.close();
  };

  const handleContextMenu: MouseEventHandler<HTMLElement> = (event) => {
    if (actionMenu === null || !(event.target instanceof Element)) return;
    const row = event.target.closest<HTMLElement>("[data-workflow-issue-id]");
    const invokedIssueId = row?.dataset.workflowIssueId;
    if (invokedIssueId === undefined) return;

    const issueIds = resolveTrailWorkflowIssueActionScope({
      invokedIssueId,
      selectedIssueIds: selection.selectedIds,
      source: "context-menu",
    });
    const context = resolveTrailWorkflowIssueActionContext(state, issueIds);
    if (context === null) return;

    if (context.actions.length === 0 && context.unavailableReason === undefined) return;

    event.preventDefault();
    event.stopPropagation();
    actionMenu.showAtMouseEvent(event.nativeEvent, {
      items: context.actions,
      onSelect: (actionId, targetId) => selectAction(context, actionId, targetId, row),
      unavailableReason: context.unavailableReason,
    });
  };

  const handlePeekActionMenu: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (
      actionMenu === null
      || peekActionContext === null
      || (peekActionContext.actions.length === 0 && peekActionContext.unavailableReason === undefined)
    ) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const page = event.currentTarget.closest<HTMLElement>(".trail-project-workspace-page");
    const issueRows = page?.querySelectorAll<HTMLElement>("[data-workflow-issue-id]") ?? [];
    const sourceRow = Array.from(issueRows).find(
      (row) => row.dataset.workflowIssueId === peekActionContext.issues[0]?.id,
    ) ?? null;
    actionMenu.showAtPosition({ x: bounds.right, y: bounds.bottom }, {
      items: peekActionContext.actions,
      onSelect: (actionId, targetId) => selectAction(
        peekActionContext,
        actionId,
        targetId,
        sourceRow,
      ),
      unavailableReason: peekActionContext.unavailableReason,
    });
  };

  const handleBulkActionMenu: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (
      actionMenu === null
      || bulkActionContext === null
      || (bulkOverflowActions.length === 0 && bulkActionContext.unavailableReason === undefined)
    ) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const returnFocusTarget = event.currentTarget;
    actionMenu.showAtPosition({ x: bounds.right, y: bounds.top }, {
      items: bulkOverflowActions,
      onSelect: (actionId, targetId) => selectAction(
        bulkActionContext,
        actionId,
        targetId,
        returnFocusTarget,
      ),
      unavailableReason: bulkActionContext.unavailableReason,
    });
  };

  const handleSelectionKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    if (
      event.defaultPrevented
      || event.key !== "Escape"
      || selection.selectedIds.size === 0
      || peek.targetId !== null
      || composerReferenceTimestamp !== null
      || deleteContext !== null
      || !isTrailCollectionSelectionKeyboardOriginEligible(event.target)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    selection.clear();
  };

  const handleKeyDownCapture: KeyboardEventHandler<HTMLElement> = (event) => {
    if (
      deleteContext !== null
      || peek.targetId === null
      || composerReferenceTimestamp !== null
    ) return;
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
      onContextMenu={handleContextMenu}
      onKeyDown={handleSelectionKeyDown}
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
                onIssueSelectionChange={selection.setSelected}
                peekTargetId={peek.targetId}
                section={section}
                selectedIssueIds={selection.selectedIds}
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
            actions={actionMenu === null || peekActionContext === null ? undefined : (
              <TrailIconButton
                icon={<TrailMoreIcon />}
                label="More issue actions"
                onClick={handlePeekActionMenu}
              />
            )}
            issue={peekIssue}
            renderMarkdown={renderMarkdown}
            showProject={false}
            timezone={readModel.configuration.temporal.timezone}
          />
        </div>
      )}

      {bulkActionContext === null ? null : (
        <div className="trail-project-workspace-page__bulk-layer">
          <TrailBulkBar
            actions={bulkCancelAction === undefined ? undefined : (
              <TrailButton
                onClick={() => executeDirectAction(
                  bulkActionContext,
                  bulkCancelAction.id,
                  bulkCancelAction.targets[0]?.id,
                )}
              >
                {bulkCancelAction.label}
              </TrailButton>
            )}
            count={selection.selectedIds.size}
            onClear={selection.clear}
            onOverflow={actionMenu === null || (
              bulkOverflowActions.length === 0
              && bulkActionContext.unavailableReason === undefined
            ) ? undefined : handleBulkActionMenu}
          />
        </div>
      )}

      {deleteContext === null ? null : (
        <TrailConfirmation
          confirmLabel="Delete"
          description={deleteContext.issues.length === 1
            ? `Delete “${deleteContext.issues[0]?.title ?? "this issue"}” from Trail?`
            : `Delete ${deleteContext.issues.length} selected issues from Trail?`}
          onConfirm={() => {
            const context = deleteContext;
            setDeleteContext(null);
            executeDirectAction(context, "issue.delete");
          }}
          onOpenChange={(open) => {
            if (!open) setDeleteContext(null);
          }}
          open
          returnFocusRef={deleteReturnFocusRef}
          title={deleteContext.issues.length > 1
            ? `Delete ${deleteContext.issues.length} issues?`
            : "Delete issue?"}
          tone="danger"
        />
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
