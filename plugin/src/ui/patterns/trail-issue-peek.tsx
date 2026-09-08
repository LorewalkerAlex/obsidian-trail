import type { ReactNode } from "react";

import type { TrailWorkflowIssuePresentationReadModel } from "../../query/shared/trail-workflow-issue-presentation-query";
import { TrailDueDate } from "../entities/trail-due";
import { TrailEstimateValue } from "../entities/trail-estimate";
import { TrailLabelDots } from "../entities/trail-label";
import {
  getTrailPriorityPresentation,
  TrailPriorityGlyph,
} from "../entities/trail-priority";
import { TrailStatusGlyph } from "../entities/trail-status";
import {
  TrailMarkdownContent,
  type TrailMarkdownRender,
} from "./trail-markdown-content";

function TrailIssuePeekMetadataItem({
  accessibleLabel,
  children,
}: {
  readonly accessibleLabel?: string;
  readonly children: ReactNode;
}) {
  return (
    <span
      aria-label={accessibleLabel}
      className="trail-issue-peek__metadata-item"
    >
      {children}
    </span>
  );
}

export function TrailIssuePeek({
  issue,
  renderMarkdown,
  showProject = true,
  timezone,
}: {
  readonly issue: TrailWorkflowIssuePresentationReadModel;
  readonly renderMarkdown: TrailMarkdownRender;
  readonly showProject?: boolean;
  readonly timezone: string;
}) {
  const priorityPresentation = getTrailPriorityPresentation(issue.priority);
  const labelNames = issue.labels.map((label) => label.name).join(", ");
  const hasContext = showProject || issue.milestone !== undefined;

  return (
    <aside
      aria-label={`Issue peek: ${issue.title}`}
      className="trail-issue-peek"
      data-issue-id={issue.id}
    >
      <div className="trail-issue-peek__content">
        <h2 className="trail-issue-peek__title">{issue.title}</h2>

        <div aria-label="Issue metadata" className="trail-issue-peek__metadata" role="group">
          <TrailIssuePeekMetadataItem accessibleLabel={`Status: ${issue.status.label}`}>
            <TrailStatusGlyph
              category={issue.status.category}
              decorative
            />
            <span>{issue.status.label}</span>
          </TrailIssuePeekMetadataItem>

          {issue.priority === undefined ? null : (
            <TrailIssuePeekMetadataItem
              accessibleLabel={`Priority: ${priorityPresentation.label}`}
            >
              <TrailPriorityGlyph decorative priority={issue.priority} />
              <span>{priorityPresentation.label}</span>
            </TrailIssuePeekMetadataItem>
          )}

          {issue.estimate === undefined ? null : (
            <TrailIssuePeekMetadataItem>
              <TrailEstimateValue estimate={issue.estimate} />
            </TrailIssuePeekMetadataItem>
          )}

          {issue.due === undefined ? null : (
            <TrailIssuePeekMetadataItem>
              <TrailDueDate timestamp={issue.due} timezone={timezone} />
            </TrailIssuePeekMetadataItem>
          )}

          {issue.inCurrentCycle ? (
            <TrailIssuePeekMetadataItem accessibleLabel="Current cycle membership">
              <span>Current cycle</span>
            </TrailIssuePeekMetadataItem>
          ) : null}
        </div>

        {hasContext ? (
          <div aria-label="Issue context" className="trail-issue-peek__context">
            {showProject ? (
              <span aria-label={`Project: ${issue.project.title}`}>
                {issue.project.title}
              </span>
            ) : null}
            {showProject && issue.milestone !== undefined ? (
              <span aria-hidden="true" className="trail-issue-peek__context-separator">·</span>
            ) : null}
            {issue.milestone === undefined ? null : (
              <span aria-label={`Milestone: ${issue.milestone.title}`}>
                {issue.milestone.title}
              </span>
            )}
          </div>
        ) : null}

        {issue.labels.length === 0 ? null : (
          <div className="trail-issue-peek__labels">
            <TrailLabelDots labels={issue.labels} />
            <span>{labelNames}</span>
          </div>
        )}

        {issue.description === undefined || issue.description.trim().length === 0 ? null : (
          <TrailMarkdownContent
            className="trail-issue-peek__description"
            markdown={issue.description}
            renderMarkdown={renderMarkdown}
          />
        )}
      </div>
    </aside>
  );
}
