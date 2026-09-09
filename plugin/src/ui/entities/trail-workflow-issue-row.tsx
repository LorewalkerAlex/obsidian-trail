import type {
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";

import type { TrailLabel } from "../../domain/model/trail-configuration";
import type {
  TrailEstimate,
  TrailPriority,
  TrailStatusCategory,
  TrailTimestamp,
} from "../../domain/model/trail-values";
import { TrailCollectionRow } from "../patterns/trail-collection-row";
import { TrailCheckbox } from "../primitives/trail-checkbox";
import { TrailDueDate } from "./trail-due";
import { TrailEstimateValue } from "./trail-estimate";
import { TrailLabelDots } from "./trail-label";
import {
  getTrailPriorityPresentation,
  TrailPriorityGlyph,
} from "./trail-priority";
import { TrailStatusGlyph } from "./trail-status";

export interface TrailWorkflowIssueRowProps {
  readonly due?: TrailTimestamp;
  readonly estimate?: TrailEstimate;
  readonly highlighted?: boolean;
  readonly inCurrentCycle?: boolean;
  readonly issueId?: string;
  readonly labels: readonly TrailLabel[];
  readonly milestoneTitle?: string;
  readonly onActivate?: () => void;
  readonly onPreviewToggle?: () => void;
  readonly onSelectionChange?: (selected: boolean, extendRange: boolean) => void;
  readonly priority?: TrailPriority;
  readonly selected?: boolean;
  readonly statusCategory: TrailStatusCategory;
  readonly statusLabel: string;
  readonly timezone: string;
  readonly title: string;
}

export function TrailWorkflowIssueRow({
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
  statusCategory,
  statusLabel,
  timezone,
  title,
}: TrailWorkflowIssueRowProps) {
  const interactive = onActivate !== undefined || onPreviewToggle !== undefined;
  const handleActivate: MouseEventHandler<HTMLDivElement> = (event) => {
    event.currentTarget.focus({ preventScroll: true });
    onActivate?.();
  };
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.defaultPrevented) return;
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
    <TrailCollectionRow
      data-peek-enabled={interactive ? "true" : undefined}
      data-workflow-issue-id={issueId}
      data-workflow-issue-row="true"
      highlighted={highlighted}
      onClick={onActivate === undefined ? undefined : handleActivate}
      onKeyDown={interactive || onSelectionChange !== undefined ? handleKeyDown : undefined}
      selected={selected}
      selectionControl={onSelectionChange === undefined ? undefined : (
        <TrailCheckbox
          checked={selected}
          label={selected ? `Deselect ${title}` : `Select ${title}`}
          onClick={(event) => onSelectionChange(!selected, event.shiftKey)}
          readOnly
        />
      )}
      tabIndex={interactive || onSelectionChange !== undefined ? 0 : undefined}
    >
      <div className="trail-workflow-issue-row__content">
        <span
          className="trail-workflow-issue-row__priority"
          title={priority === undefined
            ? undefined
            : getTrailPriorityPresentation(priority).label}
        >
          {priority === undefined ? null : <TrailPriorityGlyph priority={priority} />}
        </span>

        <span className="trail-workflow-issue-row__identity">
          <TrailStatusGlyph category={statusCategory} label={statusLabel} />
          <span className="trail-workflow-issue-row__title" title={title}>{title}</span>
        </span>

        <span className="trail-workflow-issue-row__metadata">
          <span
            className="trail-workflow-issue-row__milestone"
            title={milestoneTitle}
          >
            {milestoneTitle}
          </span>
          <span className="trail-workflow-issue-row__labels">
            {labels.length === 0 ? null : <TrailLabelDots labels={labels} />}
          </span>
          <span className="trail-workflow-issue-row__cycle">
            {inCurrentCycle ? (
              <span aria-label="In current cycle" title="In current cycle">Current</span>
            ) : null}
          </span>
          <span className="trail-workflow-issue-row__estimate">
            {estimate === undefined ? null : <TrailEstimateValue estimate={estimate} />}
          </span>
          <span className="trail-workflow-issue-row__due">
            {due === undefined ? null : (
              <TrailDueDate timestamp={due} timezone={timezone} />
            )}
          </span>
        </span>
      </div>
    </TrailCollectionRow>
  );
}
