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
import { TrailCollectionRow } from "../patterns/trail-collection-row";
import { TrailDueDate } from "./trail-due";
import { TrailEstimateValue } from "./trail-estimate";
import { TrailLabelDots } from "./trail-label";
import {
  getTrailPriorityPresentation,
  TrailPriorityGlyph,
} from "./trail-priority";

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
  readonly priority?: TrailPriority;
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
  priority,
  timezone,
  title,
}: TrailWorkflowIssueRowProps) {
  const priorityPresentation = getTrailPriorityPresentation(priority);
  const interactive = onActivate !== undefined || onPreviewToggle !== undefined;
  const handleActivate: MouseEventHandler<HTMLDivElement> = (event) => {
    event.currentTarget.focus({ preventScroll: true });
    onActivate?.();
  };
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.defaultPrevented) return;
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
      leading={(
        <span
          className="trail-workflow-issue-row__priority"
          title={priorityPresentation.label}
        >
          <TrailPriorityGlyph priority={priority} />
        </span>
      )}
      onClick={onActivate === undefined ? undefined : handleActivate}
      onKeyDown={interactive ? handleKeyDown : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="trail-workflow-issue-row__content">
        <span className="trail-workflow-issue-row__title">{title}</span>
        {milestoneTitle === undefined ? null : (
          <span
            className="trail-workflow-issue-row__milestone"
            title={milestoneTitle}
          >
            {milestoneTitle}
          </span>
        )}
        {labels.length === 0 ? null : (
          <span className="trail-workflow-issue-row__labels">
            <TrailLabelDots labels={labels} />
          </span>
        )}
        {inCurrentCycle ? (
          <span className="trail-workflow-issue-row__cycle">
            <span aria-label="In current cycle" title="In current cycle">Current</span>
          </span>
        ) : null}
        {estimate === undefined ? null : (
          <span className="trail-workflow-issue-row__estimate">
            <TrailEstimateValue estimate={estimate} />
          </span>
        )}
        {due === undefined ? null : (
          <span className="trail-workflow-issue-row__due">
            <TrailDueDate timestamp={due} timezone={timezone} />
          </span>
        )}
      </div>
    </TrailCollectionRow>
  );
}
