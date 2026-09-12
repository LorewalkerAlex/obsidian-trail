import { useState } from "react";

import type { TrailCycleStatusSectionReadModel } from "../../../query/cycles/trail-cycle-page-query";
import { TrailStatusGlyph } from "../../entities/trail-status";
import { TrailWorkflowIssueCard } from "../../entities/trail-workflow-issue-card";

const TRAIL_CYCLE_BOARD_STATUS_CATEGORY_ORDER = [
  "unstarted",
  "started",
  "completed",
] as const;

function TrailCycleLaneDisclosureIcon() {
  return (
    <svg
      aria-hidden="true"
      className="trail-cycle-board__lane-disclosure-icon"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path d="M4.5 6 8 9.5 11.5 6" />
    </svg>
  );
}

function TrailCycleProjectIcon() {
  return (
    <svg
      aria-hidden="true"
      className="trail-cycle-board__lane-project-icon"
      fill="none"
      viewBox="0 0 16 16"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      >
        <rect height="10" rx="2" width="10" x="3" y="3" />
        <path d="M6 6h4M6 8.75h4M6 11.5h2.5" />
      </g>
    </svg>
  );
}

export interface TrailCycleBoardProjectReadModel {
  readonly id: string;
  readonly issueCount: number;
  readonly title: string;
}

export function selectTrailCycleBoardSections(
  sections: readonly TrailCycleStatusSectionReadModel[],
): readonly TrailCycleStatusSectionReadModel[] {
  return TRAIL_CYCLE_BOARD_STATUS_CATEGORY_ORDER.flatMap((category) => (
    sections.filter((section) => section.category === category)
  ));
}

export function TrailCycleBoard({
  onIssuePeekOpen,
  onIssuePeekToggle,
  onIssueSelectionChange,
  onProjectActivate,
  peekTargetId,
  projects,
  sections,
  selectedIssueIds,
  timezone,
}: {
  readonly onIssuePeekOpen?: (issueId: string) => void;
  readonly onIssuePeekToggle?: (issueId: string) => void;
  readonly onIssueSelectionChange?: (
    issueId: string,
    selected: boolean,
    extendRange: boolean,
  ) => void;
  readonly onProjectActivate?: (projectId: string) => void;
  readonly peekTargetId?: string | null;
  readonly projects: readonly TrailCycleBoardProjectReadModel[];
  readonly sections: readonly TrailCycleStatusSectionReadModel[];
  readonly selectedIssueIds?: ReadonlySet<string>;
  readonly timezone: string;
}) {
  const boardSections = selectTrailCycleBoardSections(sections);
  const selected = selectedIssueIds ?? new Set<string>();
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const setProjectExpanded = (projectId: string, expanded: boolean) => {
    setCollapsedProjectIds((current) => {
      const next = new Set(current);
      if (expanded) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  return (
    <div aria-label="Current cycle board" className="trail-cycle-board" role="region">
      <div className="trail-cycle-board__inner">
        <div className="trail-cycle-board__status-grid" role="presentation">
          {boardSections.map((section) => (
            <div className="trail-cycle-board__status-header" key={section.id}>
              <span className="trail-cycle-board__status-identity">
                <TrailStatusGlyph category={section.category} label={section.label} />
                <span>{section.label}</span>
              </span>
              <span className="trail-cycle-board__status-count">{section.issues.length}</span>
            </div>
          ))}
        </div>

        <div className="trail-cycle-board__lanes">
          {projects.map((project) => {
            const collapsed = collapsedProjectIds.has(project.id);
            return (
              <section
                aria-label={`${project.title} project swimlane`}
                className="trail-cycle-board__lane"
                data-collapsed={collapsed ? "true" : undefined}
                key={project.id}
              >
                <header className="trail-cycle-board__lane-header">
                  <button
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? "Expand" : "Collapse"} ${project.title}`}
                    className="trail-cycle-board__lane-disclosure"
                    onClick={() => setProjectExpanded(project.id, collapsed)}
                    type="button"
                  >
                    <TrailCycleLaneDisclosureIcon />
                  </button>
                  <span className="trail-cycle-board__lane-identity">
                    <TrailCycleProjectIcon />
                    {onProjectActivate === undefined ? (
                      <span className="trail-cycle-board__lane-title">{project.title}</span>
                    ) : (
                      <button
                        className="trail-cycle-board__lane-title trail-cycle-board__lane-title--action"
                        onClick={() => onProjectActivate(project.id)}
                        type="button"
                      >
                        {project.title}
                      </button>
                    )}
                  </span>
                  <span className="trail-cycle-board__lane-count">{project.issueCount}</span>
                </header>

                {collapsed ? null : (
                  <div className="trail-cycle-board__lane-cells">
                    {boardSections.map((section) => {
                      const issues = section.issues.filter((issue) => issue.project.id === project.id);
                      return (
                        <div
                          aria-label={`${project.title}, ${section.label}`}
                          className="trail-cycle-board__cell"
                          data-workflow-issue-status-drop-target={section.id}
                          key={section.id}
                        >
                          {issues.map((issue) => (
                            <TrailWorkflowIssueCard
                              due={issue.due}
                              estimate={issue.estimate}
                              highlighted={peekTargetId === issue.id}
                              issueId={issue.id}
                              key={issue.id}
                              labels={issue.labels}
                              milestoneTitle={issue.milestone?.title}
                              onActivate={onIssuePeekOpen === undefined
                                ? undefined
                                : () => onIssuePeekOpen(issue.id)}
                              onPreviewToggle={onIssuePeekToggle === undefined
                                ? undefined
                                : () => onIssuePeekToggle(issue.id)}
                              onSelectionChange={onIssueSelectionChange === undefined
                                ? undefined
                                : (nextSelected, extendRange) => {
                                    onIssueSelectionChange(issue.id, nextSelected, extendRange);
                                  }}
                              priority={issue.priority}
                              selected={selected.has(issue.id)}
                              timezone={timezone}
                              title={issue.title}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
