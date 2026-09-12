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

function TrailProjectContextIcon() {
  return (
    <svg
      aria-hidden="true"
      className="trail-workflow-issue-row__project-icon"
      fill="none"
      viewBox="0 0 16 16"
    >
      <rect height="10" rx="1.75" width="10" x="3" y="3" />
      <path d="M5.5 6h5M5.5 8.25h5M5.5 10.5h3.25" />
    </svg>
  );
}

export interface TrailWorkflowIssueRowProps {
  readonly due?: TrailTimestamp;
  readonly estimate?: TrailEstimate;
  readonly highlighted?: boolean;
  /** undefined omits the Current Cycle track; false keeps the Page-owned track empty. */
  readonly inCurrentCycle?: boolean;
  readonly issueId?: string;
  readonly labels: readonly TrailLabel[];
  readonly milestoneTitle?: string;
  readonly onActivate?: () => void;
  readonly onPreviewToggle?: () => void;
  readonly onSelectionChange?: (selected: boolean, extendRange: boolean) => void;
  readonly priority?: TrailPriority;
  /** Present on cross-Project Cycle Lists; omitted when Page/lane scope already owns Project. */
  readonly projectTitle?: string;
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
  inCurrentCycle,
  issueId,
  labels,
  milestoneTitle,
  onActivate,
  onPreviewToggle,
  onSelectionChange,
  priority,
  projectTitle,
  selected = false,
  statusCategory,
  statusLabel,
  timezone,
  title,
}: TrailWorkflowIssueRowProps) {
  const interactive = onActivate !== undefined || onPreviewToggle !== undefined;
  const hasCurrentCycleTrack = inCurrentCycle !== undefined;
  const contentClassName = [
    "trail-workflow-issue-row__content",
    projectTitle === undefined ? null : "trail-workflow-issue-row__content--project",
  ].filter((className): className is string => className !== null).join(" ");
  const metadataClassName = [
    "trail-workflow-issue-row__metadata",
    hasCurrentCycleTrack ? "trail-workflow-issue-row__metadata--cycle" : null,
  ].filter((className): className is string => className !== null).join(" ");
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
      <div
        className={contentClassName}
        data-workflow-issue-drag-handle="true"
      >
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

        {projectTitle === undefined ? null : (
          <span className="trail-workflow-issue-row__project" title={projectTitle}>
            <TrailProjectContextIcon />
            <span className="trail-workflow-issue-row__project-label">{projectTitle}</span>
          </span>
        )}

        <span className={metadataClassName}>
          <span
            className="trail-workflow-issue-row__milestone"
            title={milestoneTitle}
          >
            {milestoneTitle}
          </span>
          <span className="trail-workflow-issue-row__labels">
            {labels.length === 0 ? null : <TrailLabelDots labels={labels} />}
          </span>
          {hasCurrentCycleTrack ? (
            <span className="trail-workflow-issue-row__cycle">
              {inCurrentCycle === true ? (
                <span aria-label="In current cycle" title="In current cycle">Current</span>
              ) : null}
            </span>
          ) : null}
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
