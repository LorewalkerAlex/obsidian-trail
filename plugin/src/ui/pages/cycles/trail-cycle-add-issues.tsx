import { Dialog } from "radix-ui";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStore } from "zustand";

import {
  selectTrailCycleAddIssuesReadModel,
  type TrailCycleFilterPropertyId,
} from "../../../query/cycles/trail-cycle-page-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailDueDate } from "../../entities/trail-due";
import { TrailPriorityGlyph } from "../../entities/trail-priority";
import { TrailStatusGlyph } from "../../entities/trail-status";
import { TrailCollectionFilter } from "../../interactions/trail-collection-filter";
import { useTrailCollectionFilterState } from "../../interactions/trail-collection-filter-state";
import { TrailCollectionRow } from "../../patterns/trail-collection-row";
import { TrailButton } from "../../primitives/trail-button";
import { TrailCheckbox } from "../../primitives/trail-checkbox";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { createTrailCycleFilterProperties } from "./trail-cycle-view-controls";

type TrailCycleAddIssuesActions = Pick<TrailUiActions["cycles"], "changeMembership">;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function submitLabel(count: number): string {
  if (count === 0) return "Add issues";
  return `Add ${count} ${count === 1 ? "issue" : "issues"}`;
}

export function TrailCycleAddIssues({
  actions,
  cycleId,
  onDismiss,
  runtimeStore,
}: {
  readonly actions: TrailCycleAddIssuesActions;
  readonly cycleId: string;
  readonly onDismiss: () => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const filters = useTrailCollectionFilterState<TrailCycleFilterPropertyId>();
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIssueIds, setSelectedIssueIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const searchRef = useRef<HTMLInputElement | null>(null);
  const readModel = selectTrailCycleAddIssuesReadModel(state, cycleId, {
    filter: filters.state,
    now: Date.now(),
    search,
  });
  const filterProperties = useMemo(
    () => readModel === null
      ? []
      : createTrailCycleFilterProperties(
          readModel.configuration,
          readModel.milestones,
          readModel.projects,
        ),
    [readModel],
  );

  useEffect(() => {
    if (readModel === null) onDismiss();
  }, [onDismiss, readModel]);

  if (readModel === null) return null;

  const selectedCount = selectedIssueIds.size;
  const toggleIssue = (issueId: string) => {
    if (pending) return;
    setSelectedIssueIds((current) => {
      const next = new Set(current);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (pending || selectedIssueIds.size === 0) return;
    setFeedback(undefined);

    const latest = selectTrailCycleAddIssuesReadModel(runtimeStore.getState(), cycleId, {
      filter: {},
      now: Date.now(),
      search: "",
    });
    if (latest === null) {
      setFeedback("The current cycle is no longer available.");
      return;
    }

    const selectedIds = latest.candidateIds.filter((issueId) => selectedIssueIds.has(issueId));
    if (selectedIds.length === 0) {
      setFeedback("The selected issues are no longer available to add.");
      return;
    }

    const nextIssueIds = [...latest.expectedCycle.issueIds];
    const existingIds = new Set(nextIssueIds);
    for (const issueId of selectedIds) {
      if (!existingIds.has(issueId)) {
        nextIssueIds.push(issueId);
        existingIds.add(issueId);
      }
    }

    setPending(true);
    try {
      const result = actions.changeMembership(latest.expectedCycle, nextIssueIds);
      if (result.kind === "needs-input") {
        setFeedback(result.input.message);
        return;
      }
      if (result.kind === "unchanged") {
        onDismiss();
        return;
      }
      await result.receipt.completion;
      onDismiss();
    } catch (error: unknown) {
      setFeedback(`Could not add issues: ${errorMessage(error)}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open && !pending) onDismiss();
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className="trail-cycle-add-issues__overlay" />
        <Dialog.Content
          className="trail-cycle-add-issues__content"
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchRef.current?.focus();
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <header className="trail-cycle-add-issues__header">
            <Dialog.Title className="trail-cycle-add-issues__title">Add issues</Dialog.Title>
            <Dialog.Description className="trail-cycle-add-issues__description">
              Select existing workflow issues to add to the current cycle.
            </Dialog.Description>
          </header>

          <div className="trail-cycle-add-issues__controls">
            <input
              aria-label="Search issues"
              className="trail-cycle-add-issues__search trail-view-popover__search"
              disabled={pending}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search issues..."
              ref={searchRef}
              type="search"
              value={search}
            />
            <div className="trail-cycle-add-issues__filter">
              <TrailCollectionFilter
                layer="modal-child"
                onClearAll={filters.clearAll}
                onClearClause={filters.clearClause}
                onSetDueValue={filters.setDueValue}
                onToggleDiscreteValue={filters.toggleDiscreteValue}
                properties={filterProperties}
                state={filters.state}
              />
            </div>
          </div>

          <div
            aria-label="Issues available to add"
            aria-multiselectable="true"
            className="trail-cycle-add-issues__candidates"
            role="listbox"
          >
            {readModel.candidates.length === 0 ? (
              <div className="trail-cycle-add-issues__empty">
                {readModel.candidateIds.length === 0
                  ? "No open issues are available from in-progress projects."
                  : "No issues match the current search and filters."}
              </div>
            ) : readModel.candidates.map((issue) => {
              const selected = selectedIssueIds.has(issue.id);
              return (
                <TrailCollectionRow
                  aria-selected={selected}
                  data-cycle-add-issues-candidate="true"
                  key={issue.id}
                  onClick={() => toggleIssue(issue.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    toggleIssue(issue.id);
                  }}
                  role="option"
                  selected={selected}
                  selectionControl={(
                    <TrailCheckbox
                      checked={selected}
                      disabled={pending}
                      label={selected ? `Deselect ${issue.title}` : `Select ${issue.title}`}
                      onClick={() => toggleIssue(issue.id)}
                      readOnly
                    />
                  )}
                  tabIndex={0}
                >
                  <div className="trail-cycle-add-issues__candidate-content">
                    <span className="trail-cycle-add-issues__priority">
                      {issue.priority === undefined ? null : (
                        <TrailPriorityGlyph decorative priority={issue.priority} />
                      )}
                    </span>
                    <span className="trail-cycle-add-issues__candidate-title" title={issue.title}>
                      {issue.title}
                    </span>
                    <span className="trail-cycle-add-issues__project" title={issue.project.title}>
                      {issue.project.title}
                    </span>
                    <span className="trail-cycle-add-issues__status" title={issue.status.label}>
                      <TrailStatusGlyph
                        category={issue.status.category}
                        decorative
                      />
                    </span>
                    <span className="trail-cycle-add-issues__due">
                      {issue.due === undefined ? null : (
                        <TrailDueDate
                          timestamp={issue.due}
                          timezone={readModel.configuration.temporal.timezone}
                        />
                      )}
                    </span>
                  </div>
                </TrailCollectionRow>
              );
            })}
          </div>

          {feedback === undefined ? null : (
            <div className="trail-cycle-add-issues__feedback" role="alert">{feedback}</div>
          )}

          <footer className="trail-cycle-add-issues__footer">
            <span className="trail-cycle-add-issues__selection-count">
              {selectedCount} selected
            </span>
            <div className="trail-cycle-add-issues__actions">
              <TrailButton disabled={pending} onClick={onDismiss}>Cancel</TrailButton>
              <TrailButton
                disabled={selectedCount === 0 || pending}
                onClick={() => void handleSubmit()}
                variant="primary"
              >
                {pending ? "Adding..." : submitLabel(selectedCount)}
              </TrailButton>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
