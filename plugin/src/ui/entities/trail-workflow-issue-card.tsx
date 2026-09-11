import type {
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";

import type { TrailLabel } from "../../domain/model/trail-configuration";
import type {
  TrailEstimate,
  TrailPriority,
  TrailTimestamp,
} from "../../domain/model/trail-values";
import { TrailCheckbox } from "../primitives/trail-checkbox";
import { TrailDueDate } from "./trail-due";
import { TrailEstimateValue } from "./trail-estimate";
import { TrailLabelDots } from "./trail-label";
import {
  getTrailPriorityPresentation,
  TrailPriorityGlyph,
} from "./trail-priority";

export interface TrailWorkflowIssueCardProps {
  readonly due?: TrailTimestamp;
  readonly estimate?: TrailEstimate;
  readonly highlighted?: boolean;
  readonly inCurrentCycle?: boolean;
  readonly issueId: string;
  readonly labels: readonly TrailLabel[];
  readonly milestoneTitle?: string;
  readonly onActivate?: () => void;
  readonly onPreviewToggle?: () => void;
  readonly onSelectionChange?: (selected: boolean, extendRange: boolean) => void;
  readonly priority?: TrailPriority;
  readonly selected?: boolean;
  readonly timezone: string;
  readonly title: string;
}

export function TrailWorkflowIssueCard({
  due,
  estimate,
  highlighted = false,
  inCurrentCycle = false,
  issueId,
  labels,
  milestoneTitle,
  onActivate,
  onPreviewToggle,
  onSelectionChange,
  priority,
  selected = false,
  timezone,
  title,
}: TrailWorkflowIssueCardProps) {
  const interactive = onActivate !== undefined || onPreviewToggle !== undefined;
  const handleActivate: MouseEventHandler<HTMLDivElement> = (event) => {
    event.currentTarget.closest<HTMLElement>("[data-workflow-issue-card='true']")
      ?.focus({ preventScroll: true });
    onActivate?.();
  };
  const handleKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    if (
      event.key.toLowerCase() === "x"
      && !event.altKey
      && !event.ctrlKey
      && !event.metaKey
      && onSelectionChange !== undefined
    ) {
      event.preventDefault();
      event.stopPropagation();
      onSelectionChange(!selected, false);
      return;
    }
    if (event.key === " " && onPreviewToggle !== undefined) {
      event.preventDefault();
      onPreviewToggle();
      return;
    }
    if (event.key === "Enter" && onActivate !== undefined) {
      event.preventDefault();
      onActivate();
    }
  };

  return (
    <article
      className="trail-workflow-issue-card"
      data-highlighted={highlighted ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-workflow-issue-card="true"
      data-workflow-issue-id={issueId}
      onKeyDown={interactive || onSelectionChange !== undefined ? handleKeyDown : undefined}
      tabIndex={interactive || onSelectionChange !== undefined ? 0 : undefined}
    >
      {onSelectionChange === undefined ? null : (
        <span className="trail-workflow-issue-card__selection">
          <TrailCheckbox
            checked={selected}
            label={selected ? `Deselect ${title}` : `Select ${title}`}
            onClick={(event) => onSelectionChange(!selected, event.shiftKey)}
            readOnly
          />
        </span>
      )}

      <div
        className="trail-workflow-issue-card__drag-surface"
        data-workflow-issue-drag-handle="true"
        onClick={onActivate === undefined ? undefined : handleActivate}
      >
        <div className="trail-workflow-issue-card__heading">
          <span
            className="trail-workflow-issue-card__priority"
            title={priority === undefined
              ? undefined
              : getTrailPriorityPresentation(priority).label}
          >
            {priority === undefined ? null : <TrailPriorityGlyph priority={priority} />}
          </span>
          <span className="trail-workflow-issue-card__title" title={title}>{title}</span>
        </div>

        <div className="trail-workflow-issue-card__metadata">
          <span className="trail-workflow-issue-card__milestone" title={milestoneTitle}>
            {milestoneTitle}
          </span>
          <span className="trail-workflow-issue-card__labels">
            {labels.length === 0 ? null : <TrailLabelDots labels={labels} />}
          </span>
          <span className="trail-workflow-issue-card__cycle">
            {inCurrentCycle ? (
              <span aria-label="In current cycle" title="In current cycle">Current</span>
            ) : null}
          </span>
          <span className="trail-workflow-issue-card__estimate">
            {estimate === undefined ? null : <TrailEstimateValue estimate={estimate} />}
          </span>
          <span className="trail-workflow-issue-card__due">
            {due === undefined ? null : (
              <TrailDueDate timestamp={due} timezone={timezone} />
            )}
          </span>
        </div>
      </div>
    </article>
  );
}
