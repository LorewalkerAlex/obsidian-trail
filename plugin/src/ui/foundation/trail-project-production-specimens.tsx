import type { TrailCycleStatusSectionReadModel } from "../../query/cycles/trail-cycle-page-query";
import type { TrailWorkflowIssuePresentationReadModel } from "../../query/shared/trail-workflow-issue-presentation-query";
import type {
  TrailProjectStatusCategory,
  TrailStatusCategory,
} from "../../domain/model/trail-values";
import { TrailProjectSummaryRow } from "../entities/trail-project-summary-row";
import { TrailStatusGlyph } from "../entities/trail-status";
import { TrailWorkflowIssueCard } from "../entities/trail-workflow-issue-card";
import { TrailWorkflowIssueRow } from "../entities/trail-workflow-issue-row";
import { TrailBoard, TrailBoardColumn } from "../patterns/trail-board";
import { TrailCycleBoard } from "../pages/cycles/trail-cycle-board";
import { TrailGroupHeader } from "../patterns/trail-group-header";
import { TrailIssuePeek } from "../patterns/trail-issue-peek";
import type { TrailMarkdownRender } from "../patterns/trail-page-narrative";
import {
  TRAIL_FOUNDATION_CONFIGURATION,
  TRAIL_FOUNDATION_REFERENCE_TIMESTAMP,
} from "./trail-foundation-fixtures";
import {
  LabSpecimenRow,
  LabStateGrid,
} from "./trail-lab-showroom";

interface TrailWorkflowStatusRowFixture {
  readonly category: TrailStatusCategory;
  readonly label: string;
  readonly title: string;
}

const WORKFLOW_STATUS_ROWS: readonly TrailWorkflowStatusRowFixture[] = [
  {
    category: "backlog",
    label: "Backlog",
    title: "Capture a rough planning idea",
  },
  {
    category: "unstarted",
    label: "Todo",
    title: "Prepare the next implementation slice",
  },
  {
    category: "started",
    label: "In Progress",
    title: "Calibrate the Projects scanning hierarchy",
  },
  {
    category: "completed",
    label: "Done",
    title: "Close an accepted visual pass",
  },
  {
    category: "canceled",
    label: "Canceled",
    title: "Drop a superseded experiment",
  },
];

interface TrailProjectRowFixture {
  readonly due?: number;
  readonly priority: "urgent" | "high" | "medium" | "low" | undefined;
  readonly progress:
    | { readonly max: number; readonly value: number }
    | { readonly unavailable: true };
  readonly statusCategory: TrailProjectStatusCategory;
  readonly statusLabel: string;
  readonly title: string;
}

const PROJECT_ROWS: readonly TrailProjectRowFixture[] = [
  {
    due: TRAIL_FOUNDATION_REFERENCE_TIMESTAMP + (6 * 24 * 60 * 60 * 1000),
    priority: "high",
    progress: { max: 12, value: 8 },
    statusCategory: "started",
    statusLabel: "In Progress",
    title: "Rebuild the Projects scanning hierarchy",
  },
  {
    due: TRAIL_FOUNDATION_REFERENCE_TIMESTAMP + (18 * 24 * 60 * 60 * 1000),
    priority: "medium",
    progress: { max: 8, value: 0 },
    statusCategory: "unstarted",
    statusLabel: "Planned",
    title: "Prepare the next planning pass",
  },
  {
    priority: "low",
    progress: { max: 9, value: 9 },
    statusCategory: "completed",
    statusLabel: "Completed",
    title: "Close the previous design-system pass",
  },
  {
    priority: undefined,
    progress: { unavailable: true },
    statusCategory: "canceled",
    statusLabel: "Canceled",
    title: "Retired project with no current progress denominator",
  },
];

const renderFoundationMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function TrailWorkflowStatusRow({
  category,
  label,
  title,
}: TrailWorkflowStatusRowFixture) {
  return (
    <TrailWorkflowIssueRow
      labels={[]}
      onSelectionChange={() => { /* static selection specimen */ }}
      statusCategory={category}
      statusLabel={label}
      timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
      title={title}
    />
  );
}

export function TrailProjectProductionSpecimens() {
  const issueLabels = TRAIL_FOUNDATION_CONFIGURATION.labels.filter(({ id }) => (
    id === "foundation-design" || id === "foundation-navigation"
  ));
  const richPeek: TrailWorkflowIssuePresentationReadModel = {
    description: "Review the complete lightweight Issue body without leaving the Project collection. Keep the preview calm even when this content spans several lines and includes [[ordinary Obsidian links]].",
    due: TRAIL_FOUNDATION_REFERENCE_TIMESTAMP + (2 * 24 * 60 * 60 * 1000),
    estimate: "large",
    id: "foundation-peek-rich",
    inCurrentCycle: true,
    labels: issueLabels,
    milestone: { id: "milestone-peek", title: "Workspace interaction pass" },
    priority: "urgent",
    project: { id: "project-peek", title: "Polish visual foundation" },
    status: {
      category: "started",
      id: "foundation-status-started",
      label: "In Progress",
    },
    title: "Calibrate the read-only Issue Peek surface",
  };
  const sparsePeek: TrailWorkflowIssuePresentationReadModel = {
    id: "foundation-peek-sparse",
    inCurrentCycle: false,
    labels: [],
    project: { id: "project-peek", title: "Polish visual foundation" },
    status: {
      category: "backlog",
      id: "foundation-status-backlog",
      label: "Backlog",
    },
    title: "Keep absent optional detail quiet",
  };
  const cycleBoardSections: readonly TrailCycleStatusSectionReadModel[] = [
    {
      category: "unstarted",
      id: "foundation-cycle-todo",
      issues: [{
        id: "foundation-cycle-alpha-todo",
        inCurrentCycle: true,
        labels: issueLabels.slice(0, 1),
        priority: "medium",
        project: { id: "foundation-project-alpha", title: "Polish visual foundation" },
        status: {
          category: "unstarted",
          id: "foundation-cycle-todo",
          label: "Todo",
        },
        title: "Prepare the Cycle page composition",
      }],
      label: "Todo",
    },
    {
      category: "started",
      id: "foundation-cycle-started",
      issues: [
        {
          due: TRAIL_FOUNDATION_REFERENCE_TIMESTAMP + (2 * 24 * 60 * 60 * 1000),
          estimate: "large",
          id: "foundation-cycle-alpha-started",
          inCurrentCycle: true,
          labels: issueLabels,
          milestone: { id: "foundation-cycle-milestone", title: "Workspace interaction pass" },
          priority: "urgent",
          project: { id: "foundation-project-alpha", title: "Polish visual foundation" },
          status: {
            category: "started",
            id: "foundation-cycle-started",
            label: "In Progress",
          },
          title: "Build the Current Cycle read surface",
        },
        {
          estimate: "medium",
          id: "foundation-cycle-beta-started",
          inCurrentCycle: true,
          labels: [],
          priority: "high",
          project: { id: "foundation-project-beta", title: "Refine navigation and search" },
          status: {
            category: "started",
            id: "foundation-cycle-started",
            label: "In Progress",
          },
          title: "Keep Project lanes readable across the Board",
        },
      ],
      label: "In Progress",
    },
    {
      category: "completed",
      id: "foundation-cycle-done",
      issues: [{
        id: "foundation-cycle-beta-done",
        inCurrentCycle: true,
        labels: [],
        priority: "low",
        project: { id: "foundation-project-beta", title: "Refine navigation and search" },
        status: {
          category: "completed",
          id: "foundation-cycle-done",
          label: "Done",
        },
        title: "Close the Cycle collection foundation",
      }],
      label: "Done",
    },
  ];
  const cycleBoardProjects = [
    { id: "foundation-project-alpha", issueCount: 2, title: "Polish visual foundation" },
    { id: "foundation-project-beta", issueCount: 2, title: "Refine navigation and search" },
  ] as const;

  return (
    <>
      <LabSpecimenRow
        description="The production Workflow Issue Row keeps a selectable gutter, a distinct Priority track, then Status + Title as the primary identity. This state gallery isolates the five lifecycle Status identities through the same owner used by Product Pages."
        kind="state-gallery"
        owner="TrailWorkflowIssueRow"
        title="Workflow status rows"
      >
        <div className="trail-lab-list">
          <div className="trail-lab-list__header">
            <span>Issue workflow</span>
            <span>5 states</span>
          </div>
          {WORKFLOW_STATUS_ROWS.map((issue) => (
            <TrailWorkflowStatusRow key={issue.category} {...issue} />
          ))}
        </div>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="The Project Workspace keeps the complete Status skeleton while every production Issue row uses the same selectable leading grammar: Priority, then Status + Title, followed by stable soft metadata columns. Empty values stay visually blank without placeholder text."
        kind="composition-gallery"
        owner="TrailGroupHeader + TrailWorkflowIssueRow + Project Workspace composition"
        title="Project workspace issue rows"
      >
        <div className="trail-lab-list trail-project-workspace-page__sections">
          <section className="trail-project-workspace-page__status-section">
            <TrailGroupHeader
              count={3}
              expanded
              label="In progress"
              onExpandedChange={() => { /* static composition */ }}
            />
            <TrailWorkflowIssueRow
              due={TRAIL_FOUNDATION_REFERENCE_TIMESTAMP + (2 * 24 * 60 * 60 * 1000)}
              estimate="large"
              inCurrentCycle
              labels={issueLabels}
              milestoneTitle="Workspace interaction pass"
              onSelectionChange={() => { /* static selection specimen */ }}
              priority="urgent"
              selected
              statusCategory="started"
              statusLabel="In Progress"
              timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
              title="Establish workspace page composition"
            />
            <TrailWorkflowIssueRow
              estimate="medium"
              inCurrentCycle={false}
              labels={issueLabels.slice(0, 1)}
              onSelectionChange={() => { /* static selection specimen */ }}
              priority="high"
              statusCategory="started"
              statusLabel="In Progress"
              timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
              title="Verify a deliberately long Issue title keeps the soft metadata columns readable under ordinary width pressure"
            />
            <TrailWorkflowIssueRow
              inCurrentCycle={false}
              labels={[]}
              onSelectionChange={() => { /* static selection specimen */ }}
              priority={undefined}
              statusCategory="started"
              statusLabel="In Progress"
              timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
              title="Keep optional metadata quiet when absent"
            />
          </section>
          <section className="trail-project-workspace-page__status-section" data-empty="true">
            <TrailGroupHeader
              count={0}
              expanded
              label="Todo"
              onExpandedChange={() => { /* static composition */ }}
            />
          </section>
        </div>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="Cycle List reuses the production Workflow Issue Row but elevates the owning Project into persistent scope context between Issue identity and soft planning metadata. Project stays readable longer as width compresses, while redundant Current Cycle membership remains absent inside Cycle scope."
        kind="composition-gallery"
        owner="TrailWorkflowIssueRow + Current Cycle List composition"
        title="Cycle list issue rows"
      >
        <div className="trail-lab-list">
          <TrailGroupHeader
            count={2}
            expanded
            label="In progress"
            onExpandedChange={() => { /* static composition */ }}
          />
          <TrailWorkflowIssueRow
            due={TRAIL_FOUNDATION_REFERENCE_TIMESTAMP + (2 * 24 * 60 * 60 * 1000)}
            estimate="large"
            labels={issueLabels}
            milestoneTitle="Workspace interaction pass"
            onSelectionChange={() => { /* static selection specimen */ }}
            priority="urgent"
            projectTitle="Polish visual foundation"
            statusCategory="started"
            statusLabel="In Progress"
            timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
            title="Establish the Current Cycle read surface"
          />
          <TrailWorkflowIssueRow
            labels={[]}
            onSelectionChange={() => { /* static selection specimen */ }}
            priority="medium"
            projectTitle="Refine navigation and search"
            statusCategory="started"
            statusLabel="In Progress"
            timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
            title="Keep Project identity visible across mixed Cycle scope"
          />
        </div>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="Current Cycle Board keeps Status horizontal and Project vertical. A persistent Project glyph + title owns each actionable swimlane header rather than repeating inside every card, while the production Workflow Issue Card remains the shared scan unit and each Status cell remains the only drag target."
        kind="composition-gallery"
        owner="TrailCycleBoard + TrailWorkflowIssueCard"
        title="Cycle board project swimlanes"
      >
        <TrailCycleBoard
          onIssueSelectionChange={() => { /* static selection specimen */ }}
          onProjectActivate={() => { /* static navigation specimen */ }}
          projects={cycleBoardProjects}
          sections={cycleBoardSections}
          selectedIssueIds={new Set(["foundation-cycle-alpha-started"])}
          timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
        />
      </LabSpecimenRow>

      <LabSpecimenRow
        description="The shared Board owner keeps three horizontal Status columns at a useful minimum width and lets the canvas overflow horizontally instead of stacking. The production Workflow Issue Card keeps only scan-worthy Project execution metadata and relies on the column for Status context."
        kind="composition-gallery"
        owner="TrailBoard + TrailWorkflowIssueCard"
        title="Project issue board"
      >
        <TrailBoard label="Foundation project issue board">
          <TrailBoardColumn
            count={1}
            label="Todo"
            leading={<TrailStatusGlyph category="unstarted" label="Todo" />}
          >
            <TrailWorkflowIssueCard
              issueId="foundation-board-todo"
              labels={issueLabels.slice(0, 1)}
              onSelectionChange={() => { /* static selection specimen */ }}
              priority="medium"
              timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
              title="Prepare the next implementation slice"
            />
          </TrailBoardColumn>
          <TrailBoardColumn
            count={2}
            label="In Progress"
            leading={<TrailStatusGlyph category="started" label="In Progress" />}
          >
            <TrailWorkflowIssueCard
              due={TRAIL_FOUNDATION_REFERENCE_TIMESTAMP + (2 * 24 * 60 * 60 * 1000)}
              estimate="large"
              inCurrentCycle
              issueId="foundation-board-started"
              labels={issueLabels}
              milestoneTitle="Workspace interaction pass"
              onSelectionChange={() => { /* static selection specimen */ }}
              priority="urgent"
              selected
              timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
              title="Build and calibrate the Project Board"
            />
            <TrailWorkflowIssueCard
              estimate="medium"
              issueId="foundation-board-started-long"
              labels={[]}
              onSelectionChange={() => { /* static selection specimen */ }}
              priority="high"
              timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
              title="Keep a deliberately longer Issue title compact without turning the Board card into a mini Full Item"
            />
          </TrailBoardColumn>
          <TrailBoardColumn
            count={0}
            label="Done"
            leading={<TrailStatusGlyph category="completed" label="Done" />}
          />
        </TrailBoard>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="The same production read-only Peek surface is shown with rich and sparse Issue presentations. Project Workspace owns floating placement; this specimen calibrates the reusable surface itself, including its stable path into Full Item."
        kind="composition-gallery"
        owner="TrailIssuePeek"
        title="Workflow Issue Peek"
      >
        <LabStateGrid>
          <TrailIssuePeek
            issue={richPeek}
            onOpenFullItem={() => { /* static navigation specimen */ }}
            renderMarkdown={renderFoundationMarkdown}
            timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
          />
          <TrailIssuePeek
            issue={sparsePeek}
            onOpenFullItem={() => { /* static navigation specimen */ }}
            renderMarkdown={renderFoundationMarkdown}
            timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
          />
        </LabStateGrid>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="The production Projects scanning row is also the Project Status state gallery: the leading Project Status glyph carries lifecycle identity, while Priority, Progress, and Due remain separate scan metadata without a duplicate Status text column."
        kind="composition-gallery"
        owner="TrailProjectSummaryRow"
        title="Project summary rows"
      >
        <div className="trail-lab-list">
          <TrailGroupHeader
            count={PROJECT_ROWS.length}
            expanded
            label="Initiative Alpha"
            onExpandedChange={() => { /* static composition */ }}
            onIdentityActivate={() => { /* static composition */ }}
          />
          {PROJECT_ROWS.map((project, index) => (
            <TrailProjectSummaryRow
              due={project.due}
              key={project.title}
              onSelectionChange={() => { /* static selection specimen */ }}
              priority={project.priority}
              progress={project.progress}
              selected={index === 0}
              statusCategory={project.statusCategory}
              statusLabel={project.statusLabel}
              timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
              title={project.title}
            />
          ))}
        </div>
      </LabSpecimenRow>
    </>
  );
}
