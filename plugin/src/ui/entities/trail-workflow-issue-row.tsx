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
  readonly inCurrentCycle?: boolean;
  readonly labels: readonly TrailLabel[];
  readonly milestoneTitle?: string;
  readonly priority?: TrailPriority;
  readonly timezone: string;
  readonly title: string;
}

export function TrailWorkflowIssueRow({
  due,
  estimate,
  inCurrentCycle = false,
  labels,
  milestoneTitle,
  priority,
  timezone,
  title,
}: TrailWorkflowIssueRowProps) {
  const priorityPresentation = getTrailPriorityPresentation(priority);

  return (
    <TrailCollectionRow
      data-workflow-issue-row="true"
      leading={(
        <span
          className="trail-workflow-issue-row__priority"
          title={priorityPresentation.label}
        >
          <TrailPriorityGlyph priority={priority} />
        </span>
      )}
    >
      <div className="trail-workflow-issue-row__content">
        <span className="trail-workflow-issue-row__title">{title}</span>
        <span
          className="trail-workflow-issue-row__milestone"
          title={milestoneTitle}
        >
          {milestoneTitle ?? ""}
        </span>
        <span className="trail-workflow-issue-row__labels">
          <TrailLabelDots labels={labels} />
        </span>
        <span className="trail-workflow-issue-row__cycle">
          {inCurrentCycle ? (
            <span aria-label="In current cycle" title="In current cycle">Current</span>
          ) : null}
        </span>
        <span className="trail-workflow-issue-row__estimate">
          <TrailEstimateValue estimate={estimate} />
        </span>
        <span className="trail-workflow-issue-row__due">
          {due === undefined ? null : (
            <TrailDueDate timestamp={due} timezone={timezone} />
          )}
        </span>
      </div>
    </TrailCollectionRow>
  );
}
