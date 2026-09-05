import type { TrailConfiguration } from "../../../domain/model/trail-configuration";
import type { TrailTriageIssue } from "../../../domain/model/trail-entities";
import { TrailDuePropertySelect } from "../../entities/trail-due-property-select";
import { TrailLabelPropertySelect } from "../../entities/trail-label-property-select";
import { TrailPriorityPropertySelect } from "../../entities/trail-priority-property-select";
import { TrailButton } from "../../primitives/trail-button";
import { TrailIconButton } from "../../primitives/trail-icon-button";
import { TrailInput } from "../../primitives/trail-input";
import { TrailTextarea } from "../../primitives/trail-textarea";

export interface TrailTriageReviewDraft {
  readonly description: string;
  readonly due: number;
  readonly labelIds: readonly string[];
  readonly priority: TrailTriageIssue["priority"];
  readonly title: string;
}

export type TrailTriageReviewPendingKind = "defer" | "delete" | "edit";

function TrailArrowIcon({ direction }: { readonly direction: "down" | "left" | "up" }) {
  const path = direction === "left"
    ? "M10.5 3.5 6 8l4.5 4.5"
    : direction === "up"
      ? "M4 10 8 6l4 4"
      : "M4 6l4 4 4-4";
  return (
    <svg aria-hidden="true" className="trail-triage-review__icon" viewBox="0 0 16 16">
      <path d={path} />
    </svg>
  );
}

function TrailClockIcon() {
  return (
    <svg aria-hidden="true" className="trail-triage-review__action-icon" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5.25" />
      <path d="M8 5v3.25l2.25 1.25" />
    </svg>
  );
}

function TrailTrashIcon() {
  return (
    <svg aria-hidden="true" className="trail-triage-review__action-icon" viewBox="0 0 16 16">
      <path d="M4.5 5.25h7l-.5 7h-6zM6.25 5.25V3.5h3.5v1.75M3.5 5.25h9" />
    </svg>
  );
}

function shouldCommitTextDraftOnBlur(
  currentTarget: HTMLElement,
  relatedTarget: EventTarget | null,
): boolean {
  if (!(relatedTarget instanceof Element)) return true;
  const reviewSurface = currentTarget.closest(".trail-triage-review");
  if (reviewSurface === null) return true;
  if (!reviewSurface.contains(relatedTarget)) return false;
  return relatedTarget.closest("[data-review-transition-region='true']") === null;
}

export interface TrailTriageReviewSurfaceProps {
  readonly canNext: boolean;
  readonly canPrevious: boolean;
  readonly configuration: TrailConfiguration;
  readonly draft: TrailTriageReviewDraft;
  readonly feedback?: string;
  readonly onBack: () => void;
  readonly onCommitDraft: () => void;
  readonly onDefer: () => void;
  readonly onDelete: () => void;
  readonly onDescriptionChange: (description: string) => void;
  readonly onDueChange: (due: number) => void;
  readonly onLabelsChange: (labelIds: readonly string[]) => void;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onPriorityChange: (priority: TrailTriageIssue["priority"]) => void;
  readonly onTitleChange: (title: string) => void;
  readonly pending?: TrailTriageReviewPendingKind;
  readonly positionLabel: string;
}

export function TrailTriageReviewSurface({
  canNext,
  canPrevious,
  configuration,
  draft,
  feedback,
  onBack,
  onCommitDraft,
  onDefer,
  onDelete,
  onDescriptionChange,
  onDueChange,
  onLabelsChange,
  onNext,
  onPrevious,
  onPriorityChange,
  onTitleChange,
  pending,
  positionLabel,
}: TrailTriageReviewSurfaceProps) {
  const mutationLocked = pending === "defer" || pending === "delete";
  const pendingLabel = pending === "edit"
    ? "Saving..."
    : pending === "defer"
      ? "Deferring..."
      : pending === "delete"
        ? "Deleting..."
        : undefined;

  return (
    <section
      aria-label="Triage review"
      className="trail-triage-review"
      data-pending={pending}
    >
      <header className="trail-triage-review__header">
        <div
          className="trail-triage-review__navigation"
          data-review-transition-region="true"
        >
          <span className="trail-triage-review__back">
            <TrailIconButton
              disabled={mutationLocked}
              icon={<TrailArrowIcon direction="left" />}
              label="Back to Triage queue"
              onClick={onBack}
            />
          </span>
          <TrailIconButton
            disabled={mutationLocked || !canPrevious}
            icon={<TrailArrowIcon direction="up" />}
            label="Previous Triage entry"
            onClick={onPrevious}
          />
          <TrailIconButton
            disabled={mutationLocked || !canNext}
            icon={<TrailArrowIcon direction="down" />}
            label="Next Triage entry"
            onClick={onNext}
          />
          <span className="trail-triage-review__position">{positionLabel}</span>
        </div>
        <div className="trail-triage-review__actions">
          {pendingLabel === undefined ? null : (
            <span className="trail-triage-review__pending">{pendingLabel}</span>
          )}
          <TrailButton
            aria-label="Defer Triage entry"
            data-action="defer"
            disabled={mutationLocked}
            onClick={onDefer}
          >
            <TrailClockIcon />
            <span className="trail-triage-review__action-label">Defer</span>
          </TrailButton>
          <TrailButton
            aria-label="Delete Triage entry"
            data-action="delete"
            disabled={mutationLocked}
            onClick={onDelete}
          >
            <TrailTrashIcon />
            <span className="trail-triage-review__action-label">Delete</span>
          </TrailButton>
        </div>
      </header>

      <div className="trail-triage-review__content">
        <div className="trail-triage-review__title">
          <TrailInput
            aria-label="Triage title"
            disabled={mutationLocked}
            onBlur={(event) => {
              if (shouldCommitTextDraftOnBlur(event.currentTarget, event.relatedTarget)) {
                onCommitDraft();
              }
            }}
            onChange={(event) => onTitleChange(event.currentTarget.value)}
            value={draft.title}
          />
        </div>

        <div aria-label="Triage properties" className="trail-triage-review__properties" role="group">
          <TrailPriorityPropertySelect
            disabled={mutationLocked}
            onValueChange={onPriorityChange}
            value={draft.priority}
          />
          <TrailLabelPropertySelect
            disabled={mutationLocked}
            groups={configuration.labelGroups}
            labels={configuration.labels}
            onValueChange={onLabelsChange}
            value={draft.labelIds}
          />
          <TrailDuePropertySelect
            disabled={mutationLocked}
            onValueChange={onDueChange}
            timezone={configuration.temporal.timezone}
            value={draft.due}
          />
        </div>

        <div className="trail-triage-review__description">
          <TrailTextarea
            aria-label="Triage description"
            disabled={mutationLocked}
            onBlur={(event) => {
              if (shouldCommitTextDraftOnBlur(event.currentTarget, event.relatedTarget)) {
                onCommitDraft();
              }
            }}
            onChange={(event) => onDescriptionChange(event.currentTarget.value)}
            placeholder="Add description..."
            rows={10}
            value={draft.description}
          />
        </div>

        {feedback === undefined ? null : (
          <div className="trail-triage-review__feedback" role="alert">{feedback}</div>
        )}
      </div>
    </section>
  );
}
