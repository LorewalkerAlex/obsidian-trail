import type { TrailProjectWorkspaceStatusSectionReadModel } from "../../../query/projects/trail-project-workspace-query";
import { TrailWorkflowIssueCard } from "../../entities/trail-workflow-issue-card";
import { TrailStatusGlyph } from "../../entities/trail-status";
import { TrailBoard, TrailBoardColumn } from "../../patterns/trail-board";

const TRAIL_PROJECT_BOARD_STATUS_CATEGORY_ORDER = [
  "unstarted",
  "started",
  "completed",
] as const;

export function selectTrailProjectWorkspaceBoardSections(
  sections: readonly TrailProjectWorkspaceStatusSectionReadModel[],
): readonly TrailProjectWorkspaceStatusSectionReadModel[] {
  return TRAIL_PROJECT_BOARD_STATUS_CATEGORY_ORDER.flatMap((category) => (
    sections.filter((section) => section.category === category)
  ));
}

export function TrailProjectWorkspaceBoard({
  onIssuePeekOpen,
  onIssuePeekToggle,
  onIssueSelectionChange,
  peekTargetId,
  sections,
  selectedIssueIds,
  timezone,
}: {
  readonly onIssuePeekOpen: (issueId: string) => void;
  readonly onIssuePeekToggle: (issueId: string) => void;
  readonly onIssueSelectionChange: (
    issueId: string,
    selected: boolean,
    extendRange: boolean,
  ) => void;
  readonly peekTargetId: string | null;
  readonly sections: readonly TrailProjectWorkspaceStatusSectionReadModel[];
  readonly selectedIssueIds: ReadonlySet<string>;
  readonly timezone: string;
}) {
  const boardSections = selectTrailProjectWorkspaceBoardSections(sections);

  return (
    <TrailBoard label="Project issue board">
      {boardSections.map((section) => (
        <TrailBoardColumn
          count={section.issues.length}
          data-workflow-issue-status-drop-target={section.id}
          key={section.id}
          label={section.label}
          leading={<TrailStatusGlyph category={section.category} label={section.label} />}
        >
          {section.issues.map((issue) => (
            <TrailWorkflowIssueCard
              due={issue.due}
              estimate={issue.estimate}
              highlighted={peekTargetId === issue.id}
              inCurrentCycle={issue.inCurrentCycle}
              issueId={issue.id}
              key={issue.id}
              labels={issue.labels}
              milestoneTitle={issue.milestone?.title}
              onActivate={() => onIssuePeekOpen(issue.id)}
              onPreviewToggle={() => onIssuePeekToggle(issue.id)}
              onSelectionChange={(selected, extendRange) => {
                onIssueSelectionChange(issue.id, selected, extendRange);
              }}
              priority={issue.priority}
              selected={selectedIssueIds.has(issue.id)}
              timezone={timezone}
              title={issue.title}
            />
          ))}
        </TrailBoardColumn>
      ))}
    </TrailBoard>
  );
}
