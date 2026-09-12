import type {
  KeyboardEventHandler,
  PointerEventHandler,
} from "react";
import { useRef, useState } from "react";
import { useStore } from "zustand";

import { readTrailZonedDateTimeParts } from "../../../domain/rules/trail-temporal-rules";
import {
  selectTrailCyclePageReadModel,
  type TrailCycleFilterPropertyId,
  type TrailCycleStatusSectionReadModel,
} from "../../../query/cycles/trail-cycle-page-query";
import {
  selectTrailWorkflowIssueStatusDragItems,
  type TrailWorkflowIssueStatusDragItemReadModel,
} from "../../../query/shared/trail-workflow-issue-status-drag-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailWorkflowIssueRow } from "../../entities/trail-workflow-issue-row";
import { useTrailCollectionFilterState } from "../../interactions/trail-collection-filter-state";
import {
  resolveTrailWorkflowIssueStatusDragScope,
  type TrailWorkflowIssueStatusDragScope,
} from "../../interactions/trail-workflow-issue-status-drag";
import { useTrailWorkflowIssueStatusDragPointer } from "../../interactions/trail-workflow-issue-status-drag-pointer";
import {
  getAdjacentTrailIssueId,
  isTrailIssuePeekKeyboardOriginEligible,
  useTrailIssuePeek,
} from "../../interactions/trail-issue-peek-state";
import { TrailEmptyState } from "../../patterns/trail-empty-state";
import { TrailGroupHeader } from "../../patterns/trail-group-header";
import { TrailIssuePeek } from "../../patterns/trail-issue-peek";
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import {
  TrailPageBreadcrumbButton,
  TrailPageHeader,
} from "../../patterns/trail-page-header";
import { TrailButton } from "../../primitives/trail-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCycleAddIssues } from "./trail-cycle-add-issues";
import {
  selectTrailCycleBoardSections,
  TrailCycleBoard,
} from "./trail-cycle-board";
import {
  TrailCycleViewControls,
  type TrailCycleLayout,
} from "./trail-cycle-view-controls";

type TrailCyclePageActions = Pick<TrailUiActions["issues"], "changeStatus"> & Pick<
  TrailUiActions["cycles"],
  "changeMembership"
>;

function formatCycleDate(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(timestamp));
}

function formatCycleRange(startedAt: number, plannedEnd: number, timezone: string): string {
  return `${formatCycleDate(startedAt, timezone)} – ${formatCycleDate(plannedEnd, timezone)}`;
}

const TRAIL_DAY_MS = 24 * 60 * 60 * 1000;

function calendarDayOrdinal(timestamp: number, timezone: string): number {
  const parts = readTrailZonedDateTimeParts(timestamp, timezone);
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / TRAIL_DAY_MS);
}

function formatCurrentCycleTimeRelation(
  plannedEnd: number,
  now: number,
  timezone: string,
): string {
  const deltaDays = calendarDayOrdinal(plannedEnd, timezone) - calendarDayOrdinal(now, timezone);
  if (deltaDays === 0) return "Ends today";
  if (deltaDays > 0) return `${deltaDays} ${deltaDays === 1 ? "day" : "days"} left`;
  const overdueDays = Math.abs(deltaDays);
  return `${overdueDays} ${overdueDays === 1 ? "day" : "days"} overdue`;
}

function progressLabel(progress: {
  readonly max?: number;
  readonly unavailable?: boolean;
  readonly value?: number;
}): string {
  if (progress.unavailable === true || progress.max === undefined || progress.value === undefined) {
    return "—";
  }
  return `${Math.round((progress.value / progress.max) * 100)}%`;
}

function TrailCycleStatusSection({
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
  readonly section: TrailCycleStatusSectionReadModel;
  readonly timezone: string;
}) {
  return (
    <section
      aria-label={`${section.label} issues`}
      className="trail-cycle-page__status-section"
      data-empty={section.issues.length === 0 ? "true" : undefined}
      data-workflow-issue-status-drop-target={section.id}
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
          issueId={issue.id}
          key={issue.id}
          labels={issue.labels}
          milestoneTitle={issue.milestone?.title}
          onActivate={() => onIssuePeekOpen(issue.id)}
          onPreviewToggle={() => onIssuePeekToggle(issue.id)}
          priority={issue.priority}
          projectTitle={issue.project.title}
          statusCategory={issue.status.category}
          statusLabel={issue.status.label}
          timezone={timezone}
          title={issue.title}
        />
      ))}
    </section>
  );
}

function resolveStatusDragScope(
  items: readonly TrailWorkflowIssueStatusDragItemReadModel[],
  sourceIssueId: string,
): TrailWorkflowIssueStatusDragScope | null {
  return resolveTrailWorkflowIssueStatusDragScope({
    issues: items.map((item) => ({
      id: item.id,
      statusDefinitionId: item.statusDefinitionId,
      targets: item.targets,
    })),
    selectedIssueIds: new Set<string>(),
    sourceIssueId,
  });
}

function sameIssueIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TrailCyclePage({
  actions,
  cycleId,
  onCyclesActivate,
  onIssueActivate,
  onProjectActivate,
  renderMarkdown,
  runtimeStore,
}: {
  readonly actions: TrailCyclePageActions;
  readonly cycleId: string;
  readonly onCyclesActivate: () => void;
  readonly onIssueActivate?: (issueId: string) => void;
  readonly onProjectActivate?: (projectId: string) => void;
  readonly renderMarkdown: TrailMarkdownRender;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const filters = useTrailCollectionFilterState<TrailCycleFilterPropertyId>();
  const [addIssuesOpen, setAddIssuesOpen] = useState(false);
  const [collapsedStatusIds, setCollapsedStatusIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [dragFeedback, setDragFeedback] = useState<string>();
  const [layout, setLayout] = useState<TrailCycleLayout>("board");
  const pageRef = useRef<HTMLElement | null>(null);
  const now = Date.now();
  const readModel = selectTrailCyclePageReadModel(state, cycleId, {
    filter: filters.state,
    now,
  });
  const current = readModel?.kind === "current";
  const effectiveLayout: TrailCycleLayout = current ? layout : "list";
  const boardSections = readModel?.kind === "current"
    ? selectTrailCycleBoardSections(readModel.sections)
    : [];
  const visibleIssueIds = readModel === null
    ? []
    : readModel.kind === "historical"
      ? readModel.issues.map((issue) => issue.id)
      : effectiveLayout === "board"
        ? boardSections.flatMap((section) => section.issues.map((issue) => issue.id))
        : readModel.sections.flatMap((section) => (
            collapsedStatusIds.has(section.id)
              ? []
              : section.issues.map((issue) => issue.id)
          ));
  const peek = useTrailIssuePeek(visibleIssueIds);
  const visibleIssues = readModel === null
    ? []
    : readModel.kind === "historical"
      ? readModel.issues
      : readModel.sections.flatMap((section) => section.issues);
  const peekIssue = peek.targetId === null
    ? undefined
    : visibleIssues.find((issue) => (
        issue.id === peek.targetId && visibleIssueIds.includes(issue.id)
      ));
  const writable = readModel?.kind === "current" && state.control.kind === "ready";

  const resolveCurrentDragScope = (sourceIssueId: string) => {
    const items = selectTrailWorkflowIssueStatusDragItems(
      runtimeStore.getState(),
      visibleIssueIds,
    );
    if (items === null) return null;
    return resolveStatusDragScope(items, sourceIssueId);
  };

  const handleStatusDrop = async (
    scope: TrailWorkflowIssueStatusDragScope,
    targetStatusDefinitionId: string,
  ): Promise<void> => {
    setDragFeedback(undefined);
    const latestItems = selectTrailWorkflowIssueStatusDragItems(
      runtimeStore.getState(),
      scope.issueIds,
    );
    if (latestItems === null || scope.issueIds.length === 0) return;

    const latestScope = resolveStatusDragScope(
      latestItems,
      scope.issueIds[0] ?? "",
    );
    if (
      latestScope === null
      || latestScope.sourceStatusDefinitionId !== scope.sourceStatusDefinitionId
      || !sameIssueIds(latestScope.issueIds, scope.issueIds)
      || !latestScope.targetStatusDefinitionIds.includes(targetStatusDefinitionId)
    ) {
      return;
    }

    const item = latestItems[0];
    if (item === undefined) return;
    let result: ReturnType<TrailCyclePageActions["changeStatus"]>;
    try {
      result = actions.changeStatus(item.expectedIssue, targetStatusDefinitionId);
    } catch (error: unknown) {
      setDragFeedback(`Status change failed: ${errorMessage(error)}`);
      return;
    }
    if (result.kind === "needs-input") {
      setDragFeedback(result.input.message);
      return;
    }
    if (result.kind !== "submitted") return;

    try {
      await result.receipt.completion;
    } catch (error: unknown) {
      setDragFeedback(`Status change failed: ${errorMessage(error)}`);
    }
  };

  useTrailWorkflowIssueStatusDragPointer({
    enabled: writable,
    onDrop: (scope, targetStatusDefinitionId) => {
      void handleStatusDrop(scope, targetStatusDefinitionId);
    },
    refreshKey: `${effectiveLayout}|${visibleIssueIds.join("|")}|${readModel?.kind ?? "missing"}`,
    resolveScope: resolveCurrentDragScope,
    rootRef: pageRef,
  });

  const updateSectionExpanded = (statusId: string, expanded: boolean) => {
    setCollapsedStatusIds((currentIds) => {
      const next = new Set(currentIds);
      if (expanded) next.delete(statusId);
      else next.add(statusId);
      return next;
    });
  };

  const openAddIssues = () => {
    if (!writable) return;
    peek.close();
    setAddIssuesOpen(true);
  };

  const handlePointerDownCapture: PointerEventHandler<HTMLElement> = (event) => {
    if (!(event.target instanceof Element)) return;

    const interactiveTarget = event.target.closest([
      "a",
      "button",
      "input",
      "select",
      "textarea",
      "[contenteditable='true']",
      "[role='button']",
      "[role='dialog']",
      "[role='menuitem']",
      ".trail-issue-peek",
      "[data-workflow-issue-id]",
    ].join(", ")) !== null;
    if (!interactiveTarget) pageRef.current?.focus({ preventScroll: true });

    if (peek.targetId === null) return;
    if (event.target.closest(".trail-issue-peek") !== null) return;
    if (event.target.closest("[data-workflow-issue-id]") !== null) return;
    peek.close();
  };

  const handleKeyDownCapture: KeyboardEventHandler<HTMLElement> = (event) => {
    if (peek.targetId === null) return;
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
        visibleIssueIds,
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
    return (
      <section
        aria-label="Cycle"
        className="trail-cycle-page"
        ref={pageRef}
        tabIndex={-1}
      />
    );
  }

  const timezone = readModel.configuration.temporal.timezone;
  const title = formatCycleRange(
    readModel.cycle.startedAt,
    readModel.cycle.plannedEnd,
    timezone,
  );

  return (
    <section
      aria-label={`${title} cycle`}
      className="trail-cycle-page"
      data-cycle-kind={readModel.kind}
      data-status-drag-enabled={writable ? "true" : undefined}
      onKeyDownCapture={handleKeyDownCapture}
      onPointerDownCapture={handlePointerDownCapture}
      ref={pageRef}
      tabIndex={-1}
    >
      <div className="trail-cycle-page__scroll">
        <TrailPageHeader
          actions={readModel.kind === "current" ? (
            <TrailButton disabled={!writable} onClick={openAddIssues}>Add issues</TrailButton>
          ) : undefined}
          breadcrumb={(
            <>
              <TrailPageBreadcrumbButton onClick={onCyclesActivate}>
                Cycles
              </TrailPageBreadcrumbButton>
              <span aria-hidden="true" className="trail-cycle-page__breadcrumb-separator">/</span>
            </>
          )}
          title={title}
        />

        <div aria-label="Cycle summary" className="trail-cycle-page__summary" role="group">
          <span>
            {readModel.kind === "current"
              ? formatCurrentCycleTimeRelation(readModel.cycle.plannedEnd, now, timezone)
              : `Closed ${formatCycleDate(readModel.cycle.endedAt, timezone)}`}
          </span>
          <span aria-hidden="true" className="trail-cycle-page__summary-separator">·</span>
          <span>{readModel.cycle.issueCount} issues</span>
          {readModel.kind === "current" ? (
            <>
              <span aria-hidden="true" className="trail-cycle-page__summary-separator">·</span>
              <span>{progressLabel(readModel.cycle.progress)}</span>
            </>
          ) : null}
        </div>

        <TrailCycleViewControls
          boardAvailable={readModel.kind === "current"}
          configuration={readModel.configuration}
          filter={filters.state}
          layout={effectiveLayout}
          milestones={readModel.milestones}
          onClearAllFilters={filters.clearAll}
          onClearFilterClause={filters.clearClause}
          onLayoutChange={setLayout}
          onSetDueFilter={filters.setDueValue}
          onToggleDiscreteFilter={filters.toggleDiscreteValue}
          projects={readModel.projects}
        />

        <div className="trail-cycle-page__content">
          {readModel.kind === "current" && effectiveLayout === "board" ? (
            <TrailCycleBoard
              onIssuePeekOpen={peek.open}
              onIssuePeekToggle={peek.toggle}
              onProjectActivate={onProjectActivate}
              peekTargetId={peek.targetId}
              projects={readModel.projects}
              sections={readModel.sections}
              timezone={timezone}
            />
          ) : readModel.kind === "current" ? (
            <div className="trail-cycle-page__sections">
              {readModel.sections.map((section) => (
                <TrailCycleStatusSection
                  collapsed={collapsedStatusIds.has(section.id)}
                  key={section.id}
                  onExpandedChange={(expanded) => updateSectionExpanded(section.id, expanded)}
                  onIssuePeekOpen={peek.open}
                  onIssuePeekToggle={peek.toggle}
                  peekTargetId={peek.targetId}
                  section={section}
                  timezone={timezone}
                />
              ))}
            </div>
          ) : (
            <div className="trail-cycle-page__history-list">
              {readModel.issues.map((issue) => (
                <TrailWorkflowIssueRow
                  due={issue.due}
                  estimate={issue.estimate}
                  highlighted={peek.targetId === issue.id}
                  issueId={issue.id}
                  key={issue.id}
                  labels={issue.labels}
                  milestoneTitle={issue.milestone?.title}
                  onActivate={() => peek.open(issue.id)}
                  onPreviewToggle={() => peek.toggle(issue.id)}
                  priority={issue.priority}
                  projectTitle={issue.project.title}
                  statusCategory={issue.status.category}
                  statusLabel={issue.status.label}
                  timezone={timezone}
                  title={issue.title}
                />
              ))}
            </div>
          )}

          {dragFeedback === undefined ? null : (
            <div className="trail-cycle-page__drag-feedback" role="alert">
              {dragFeedback}
            </div>
          )}

          {readModel.emptyKind === "true" ? (
            <TrailEmptyState
              action={readModel.kind === "current" ? (
                <TrailButton disabled={!writable} onClick={openAddIssues}>Add issues</TrailButton>
              ) : undefined}
              description={readModel.kind === "current"
                ? "Add existing workflow issues when this cycle is ready for work."
                : "This cycle closed without retained issue membership."}
              title="No issues in this cycle yet"
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
        <div className="trail-cycle-page__peek-layer">
          <TrailIssuePeek
            issue={peekIssue}
            onOpenFullItem={onIssueActivate === undefined
              ? undefined
              : () => onIssueActivate(peekIssue.id)}
            renderMarkdown={renderMarkdown}
            timezone={timezone}
          />
        </div>
      )}

      {readModel.kind === "current" && addIssuesOpen ? (
        <TrailCycleAddIssues
          actions={actions}
          cycleId={cycleId}
          onDismiss={() => setAddIssuesOpen(false)}
          runtimeStore={runtimeStore}
        />
      ) : null}
    </section>
  );
}
