import {
  Fragment,
  useRef,
  useState,
} from "react";
import { useStore } from "zustand";

import type { TrailTriageIssue } from "../../../domain/model/trail-entities";
import { addTrailCalendarDays } from "../../../domain/rules/trail-temporal-rules";
import {
  selectTrailReadableConfiguration,
  selectTrailReadableTriageIssueById,
} from "../../../query/shared/trail-effective-query";
import {
  selectTrailTriagePageReadModel,
  type TrailTriageFilterPropertyId,
  type TrailTriageFilterState,
  type TrailTriageOrdering,
} from "../../../query/triage/trail-triage-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailDueDate } from "../../entities/trail-due";
import { TrailLabelDots } from "../../entities/trail-label";
import { TrailTriageRow } from "../../entities/trail-triage-row";
import { useTrailCollectionFilterState } from "../../interactions/trail-collection-filter-state";
import { TrailButton } from "../../primitives/trail-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import {
  TrailTriageReviewSurface,
  type TrailTriageReviewDraft,
  type TrailTriageReviewPendingKind,
} from "./trail-triage-review-surface";
import { TrailTriageViewControls } from "./trail-triage-view-controls";

const TRAIL_TRIAGE_DEFER_DAYS = 7;

type TrailTriagePageActions = Pick<
  TrailUiActions["triage"],
  "defer" | "delete" | "edit"
>;

interface TrailTriageReviewSession {
  readonly anchorIndex: number;
  readonly baseline: TrailTriageIssue;
  readonly draft: TrailTriageReviewDraft;
  readonly feedback?: string;
  readonly issueId: string;
  readonly pending?: TrailTriageReviewPendingKind;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function reviewDraftFromIssue(issue: TrailTriageIssue): TrailTriageReviewDraft {
  return {
    description: issue.description ?? "",
    due: issue.due,
    labelIds: [...issue.labelIds],
    priority: issue.priority,
    title: issue.title,
  };
}

function reviewSessionFromIssue(
  issue: TrailTriageIssue,
  anchorIndex: number,
): TrailTriageReviewSession {
  return {
    anchorIndex,
    baseline: issue,
    draft: reviewDraftFromIssue(issue),
    issueId: issue.id,
  };
}

function currentReviewSlot(
  visibleIssueIds: readonly string[],
  session: TrailTriageReviewSession,
): number {
  const currentIndex = visibleIssueIds.indexOf(session.issueId);
  if (currentIndex >= 0) return currentIndex;
  return Math.max(0, Math.min(session.anchorIndex, visibleIssueIds.length));
}

function reviewNavigation(input: {
  readonly session: TrailTriageReviewSession;
  readonly visibleIssueIds: readonly string[];
}): {
  readonly canNext: boolean;
  readonly canPrevious: boolean;
  readonly positionLabel: string;
} {
  const index = input.visibleIssueIds.indexOf(input.session.issueId);
  if (index < 0) {
    return {
      canNext: false,
      canPrevious: false,
      positionLabel: `Not in current view - ${input.visibleIssueIds.length}`,
    };
  }

  return {
    canNext: index < input.visibleIssueIds.length - 1,
    canPrevious: index > 0,
    positionLabel: `${index + 1} / ${input.visibleIssueIds.length}`,
  };
}

export function TrailTriagePage({
  actions,
  runtimeStore,
}: {
  readonly actions: TrailTriagePageActions;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const now = Date.now();
  const filters = useTrailCollectionFilterState<TrailTriageFilterPropertyId>();
  const [ordering, setOrdering] = useState<TrailTriageOrdering>("review-due");
  const readModel = selectTrailTriagePageReadModel(state, {
    filter: filters.state,
    now,
    ordering,
  });
  const configuration = readModel?.configuration ?? null;
  const issueIds = readModel?.visibleIssueIds ?? [];
  const [reviewSession, setReviewSession] = useState<TrailTriageReviewSession | null>(null);
  const editRequestVersionRef = useRef(0);
  const editTaskRef = useRef<Promise<boolean> | null>(null);
  const reviewTransitionRef = useRef(false);
  const reviewSessionRef = useRef(reviewSession);
  const filterStateRef = useRef<TrailTriageFilterState>(filters.state);
  const orderingRef = useRef(ordering);
  reviewSessionRef.current = reviewSession;
  filterStateRef.current = filters.state;
  orderingRef.current = ordering;

  const visibleIssueIdsNow = (): readonly string[] => selectTrailTriagePageReadModel(
    runtimeStore.getState(),
    {
      filter: filterStateRef.current,
      now: Date.now(),
      ordering: orderingRef.current,
    },
  )?.visibleIssueIds ?? [];

  const openReviewFromRuntime = (issueId: string, anchorIndex: number): boolean => {
    const issue = selectTrailReadableTriageIssueById(runtimeStore.getState(), issueId);
    if (issue === undefined) return false;
    const nextSession = reviewSessionFromIssue(issue, anchorIndex);
    reviewSessionRef.current = nextSession;
    setReviewSession(nextSession);
    return true;
  };

  const setReviewFeedback = (
    session: TrailTriageReviewSession,
    feedback: string,
    input?: {
      readonly draft?: TrailTriageReviewDraft;
      readonly pending?: TrailTriageReviewPendingKind;
      readonly rebaseFromRuntime?: boolean;
    },
  ) => {
    const current = input?.rebaseFromRuntime === true
      ? selectTrailReadableTriageIssueById(runtimeStore.getState(), session.issueId)
      : undefined;
    const nextSession: TrailTriageReviewSession = {
      ...session,
      baseline: current ?? session.baseline,
      draft: input?.draft ?? session.draft,
      feedback,
      pending: input?.pending,
    };
    reviewSessionRef.current = nextSession;
    setReviewSession(nextSession);
  };

  const commitReviewDraft = (): Promise<boolean> => {
    editRequestVersionRef.current += 1;
    if (editTaskRef.current !== null) return editTaskRef.current;

    const task = (async (): Promise<boolean> => {
      let handledRequestVersion = 0;
      while (handledRequestVersion < editRequestVersionRef.current) {
        handledRequestVersion = editRequestVersionRef.current;
        const session = reviewSessionRef.current;
        if (
          session === null
          || session.pending === "defer"
          || session.pending === "delete"
        ) {
          return false;
        }

        const draft = session.draft;
        const anchorIndex = currentReviewSlot(visibleIssueIdsNow(), session);
        const anchoredSession = anchorIndex === session.anchorIndex
          ? session
          : { ...session, anchorIndex };

        let result: ReturnType<TrailTriagePageActions["edit"]>;
        try {
          result = actions.edit(anchoredSession.baseline, {
            description: draft.description,
            due: draft.due,
            labelIds: draft.labelIds,
            priority: draft.priority,
            title: draft.title,
          });
        } catch (error: unknown) {
          setReviewFeedback(anchoredSession, `Save failed: ${errorMessage(error)}`, {
            draft,
            rebaseFromRuntime: true,
          });
          return false;
        }

        if (result.kind === "needs-input") {
          setReviewFeedback(anchoredSession, result.input.message, { draft });
          return false;
        }

        if (result.kind === "unchanged") {
          const current = selectTrailReadableTriageIssueById(
            runtimeStore.getState(),
            session.issueId,
          );
          const latest = reviewSessionRef.current;
          if (latest === null || latest.issueId !== session.issueId) return true;
          const nextSession = current === undefined
            ? { ...anchoredSession, draft: latest.draft, feedback: undefined, pending: undefined }
            : {
                ...reviewSessionFromIssue(current, anchorIndex),
                draft: latest.draft === draft ? reviewDraftFromIssue(current) : latest.draft,
              };
          reviewSessionRef.current = nextSession;
          setReviewSession(nextSession);
          continue;
        }

        const pendingSession: TrailTriageReviewSession = {
          ...anchoredSession,
          draft,
          feedback: undefined,
          pending: "edit",
        };
        reviewSessionRef.current = pendingSession;
        setReviewSession(pendingSession);

        try {
          await result.receipt.completion;
        } catch (error: unknown) {
          const latest = reviewSessionRef.current;
          if (latest === null || latest.issueId !== session.issueId) return false;
          const recovered = selectTrailReadableTriageIssueById(
            runtimeStore.getState(),
            session.issueId,
          );
          const feedback = `Save failed: ${errorMessage(error)}`;
          const nextSession: TrailTriageReviewSession = recovered === undefined
            ? {
                ...pendingSession,
                draft: latest.draft,
                feedback,
                pending: undefined,
              }
            : {
                ...reviewSessionFromIssue(recovered, anchorIndex),
                draft: latest.draft,
                feedback,
              };
          reviewSessionRef.current = nextSession;
          setReviewSession(nextSession);
          return false;
        }

        const current = selectTrailReadableTriageIssueById(
          runtimeStore.getState(),
          session.issueId,
        );
        if (current === undefined) {
          setReviewFeedback(pendingSession, "This Triage entry is no longer available.", {
            draft,
          });
          return false;
        }

        const latest = reviewSessionRef.current;
        if (latest === null || latest.issueId !== session.issueId) return true;
        const draftChangedWhileSaving = latest.draft !== draft;
        const hasQueuedCommit = editRequestVersionRef.current > handledRequestVersion;
        const nextSession: TrailTriageReviewSession = {
          ...reviewSessionFromIssue(current, anchorIndex),
          draft: draftChangedWhileSaving ? latest.draft : reviewDraftFromIssue(current),
          pending: hasQueuedCommit ? "edit" : undefined,
        };
        reviewSessionRef.current = nextSession;
        setReviewSession(nextSession);
      }
      return true;
    })().finally(() => {
      editTaskRef.current = null;
    });

    editTaskRef.current = task;
    return task;
  };

  const settleRequestedReviewEdit = async (): Promise<void> => {
    const task = editTaskRef.current;
    if (task !== null) await task;
  };

  const runReviewTransition = async (operation: () => Promise<void>): Promise<void> => {
    if (reviewTransitionRef.current) return;
    reviewTransitionRef.current = true;
    try {
      await operation();
    } finally {
      reviewTransitionRef.current = false;
    }
  };

  const updateDraft = (patch: Partial<TrailTriageReviewDraft>) => {
    const session = reviewSessionRef.current;
    if (
      session === null
      || session.pending === "defer"
      || session.pending === "delete"
    ) return;
    const nextSession = {
      ...session,
      draft: { ...session.draft, ...patch },
      feedback: undefined,
    };
    reviewSessionRef.current = nextSession;
    setReviewSession(nextSession);
  };

  const updateAndCommitDraft = (patch: Partial<TrailTriageReviewDraft>) => {
    const session = reviewSessionRef.current;
    if (
      session === null
      || session.pending === "defer"
      || session.pending === "delete"
    ) return;
    const draft = { ...session.draft, ...patch };
    const nextSession = { ...session, draft, feedback: undefined };
    reviewSessionRef.current = nextSession;
    setReviewSession(nextSession);
    void commitReviewDraft();
  };

  const progressAfterDisposition = (sourceIssueId: string, sourceSlot: number) => {
    const remainingIssueIds = visibleIssueIdsNow().filter((issueId) => issueId !== sourceIssueId);
    const successorIssueId = remainingIssueIds[sourceSlot];
    if (successorIssueId === undefined) {
      reviewSessionRef.current = null;
      setReviewSession(null);
      return;
    }
    if (!openReviewFromRuntime(successorIssueId, sourceSlot)) {
      reviewSessionRef.current = null;
      setReviewSession(null);
    }
  };

  const runDisposition = async (kind: "defer" | "delete") => runReviewTransition(async () => {
    if (!(await commitReviewDraft())) return;
    const session = reviewSessionRef.current;
    if (session === null) return;
    const current = selectTrailReadableTriageIssueById(runtimeStore.getState(), session.issueId);
    if (current === undefined) {
      setReviewFeedback(session, "This Triage entry is no longer available.", {
        rebaseFromRuntime: true,
      });
      return;
    }

    const sourceSlot = currentReviewSlot(visibleIssueIdsNow(), session);
    try {
      if (kind === "defer") {
        const currentConfiguration = selectTrailReadableConfiguration(runtimeStore.getState());
        if (currentConfiguration === null) return;
        const due = addTrailCalendarDays(
          current.due,
          currentConfiguration.temporal.timezone,
          TRAIL_TRIAGE_DEFER_DAYS,
        );
        const receipt = actions.defer(current, due);
        const pendingSession: TrailTriageReviewSession = {
          ...session,
          baseline: current,
          draft: { ...session.draft, due },
          feedback: undefined,
          pending: "defer",
        };
        reviewSessionRef.current = pendingSession;
        setReviewSession(pendingSession);
        try {
          await receipt.completion;
        } catch (error: unknown) {
          const recovered = selectTrailReadableTriageIssueById(runtimeStore.getState(), session.issueId);
          const nextSession = recovered === undefined
            ? { ...session, feedback: `Defer failed: ${errorMessage(error)}` }
            : {
                ...reviewSessionFromIssue(recovered, session.anchorIndex),
                feedback: `Defer failed: ${errorMessage(error)}`,
              };
          reviewSessionRef.current = nextSession;
          setReviewSession(nextSession);
          return;
        }
      } else {
        const receipt = actions.delete(current);
        const pendingSession: TrailTriageReviewSession = {
          ...session,
          baseline: current,
          feedback: undefined,
          pending: "delete",
        };
        reviewSessionRef.current = pendingSession;
        setReviewSession(pendingSession);
        try {
          await receipt.completion;
        } catch (error: unknown) {
          const recovered = selectTrailReadableTriageIssueById(runtimeStore.getState(), session.issueId);
          const nextSession = recovered === undefined
            ? { ...session, feedback: `Delete failed: ${errorMessage(error)}` }
            : {
                ...reviewSessionFromIssue(recovered, session.anchorIndex),
                feedback: `Delete failed: ${errorMessage(error)}`,
              };
          reviewSessionRef.current = nextSession;
          setReviewSession(nextSession);
          return;
        }
      }
    } catch (error: unknown) {
      const actionLabel = kind === "defer" ? "Defer" : "Delete";
      setReviewFeedback(session, `${actionLabel} failed: ${errorMessage(error)}`, {
        rebaseFromRuntime: true,
      });
      return;
    }

    progressAfterDisposition(current.id, sourceSlot);
  });

  const navigateReview = async (direction: "next" | "previous") => runReviewTransition(async () => {
    await settleRequestedReviewEdit();
    const session = reviewSessionRef.current;
    if (session === null) return;
    const visibleIssueIds = visibleIssueIdsNow();
    const currentIndex = visibleIssueIds.indexOf(session.issueId);
    if (currentIndex < 0) return;
    const targetIndex = currentIndex + (direction === "next" ? 1 : -1);
    const targetIssueId = visibleIssueIds[targetIndex];
    if (targetIssueId !== undefined) openReviewFromRuntime(targetIssueId, targetIndex);
  });

  const activateReview = (issueId: string, anchorIndex: number): void => {
    const currentSession = reviewSessionRef.current;
    if (currentSession?.issueId === issueId) return;

    if (currentSession === null) {
      openReviewFromRuntime(issueId, anchorIndex);
      return;
    }

    void runReviewTransition(async () => {
      await settleRequestedReviewEdit();
      const latestSession = reviewSessionRef.current;
      if (latestSession?.issueId === issueId) return;
      openReviewFromRuntime(issueId, anchorIndex);
    });
  };

  const closeReview = async () => runReviewTransition(async () => {
    await settleRequestedReviewEdit();
    reviewSessionRef.current = null;
    setReviewSession(null);
  });

  const navigation = reviewSession === null
    ? undefined
    : reviewNavigation({ session: reviewSession, visibleIssueIds: issueIds });

  return (
    <section
      aria-label="Triage queue"
      className="trail-triage-page"
      data-review-open={reviewSession === null ? "false" : "true"}
    >
      {readModel === null || configuration === null ? null : (
        <div className="trail-triage-page__layout">
          <div className="trail-triage-page__queue-pane">
            <TrailTriageViewControls
              configuration={configuration}
              filter={filters.state}
              onClearAllFilters={filters.clearAll}
              onClearFilterClause={filters.clearClause}
              onOrderingChange={setOrdering}
              onSetDueFilter={filters.setDueValue}
              onToggleDiscreteFilter={filters.toggleDiscreteValue}
              ordering={ordering}
            />
            <div className="trail-triage-page__summary">
              {readModel.reviewSet.count} to review{readModel.reviewSet.needsGlobalQualifier ? " overall" : ""}
            </div>
            {readModel.filteredEmpty ? (
              <div className="trail-triage-page__filtered-empty">
                <span>No Triage entries match the filters.</span>
                <TrailButton onClick={filters.clearAll}>Clear filters</TrailButton>
              </div>
            ) : (
              <div className="trail-triage-page__queue">
                {readModel.queue.map((item, index) => {
                  return (
                    <Fragment key={item.id}>
                      <TrailTriageRow
                        highlighted={reviewSession?.issueId === item.id}
                        labels={item.labels.length === 0
                          ? undefined
                          : <TrailLabelDots labels={item.labels} />}
                        onActivate={() => {
                          void activateReview(item.id, index);
                        }}
                        priority={item.priority}
                        reviewDue={(
                          <TrailDueDate
                            timestamp={item.due}
                            timezone={configuration.temporal.timezone}
                          />
                        )}
                        title={item.title}
                      />
                      {item.id === readModel.reviewSet.boundaryAfterIssueId ? (
                        <div
                          aria-hidden="true"
                          className="trail-triage-page__review-boundary"
                          data-review-boundary="true"
                        />
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {reviewSession === null || navigation === undefined ? null : (
            <div className="trail-triage-page__review-pane">
              <TrailTriageReviewSurface
                canNext={navigation.canNext}
                canPrevious={navigation.canPrevious}
                configuration={configuration}
                draft={reviewSession.draft}
                feedback={reviewSession.feedback}
                onBack={() => {
                  void closeReview();
                }}
                onCommitDraft={() => {
                  void commitReviewDraft();
                }}
                onDefer={() => {
                  void runDisposition("defer");
                }}
                onDelete={() => {
                  void runDisposition("delete");
                }}
                onDescriptionChange={(description) => updateDraft({ description })}
                onDueChange={(due) => updateAndCommitDraft({ due })}
                onLabelsChange={(labelIds) => updateAndCommitDraft({ labelIds })}
                onNext={() => {
                  void navigateReview("next");
                }}
                onPrevious={() => {
                  void navigateReview("previous");
                }}
                onPriorityChange={(priority) => updateAndCommitDraft({ priority })}
                onTitleChange={(title) => updateDraft({ title })}
                pending={reviewSession.pending}
                positionLabel={navigation.positionLabel}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
