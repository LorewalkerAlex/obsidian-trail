import type {
  TrailProjectStatusCategory,
  TrailStatusCategory,
} from "../../domain/model/trail-values";
import { TrailProjectSummaryRow } from "../entities/trail-project-summary-row";
import { TrailStatusGlyph } from "../entities/trail-status";
import { TrailWorkflowIssueRow } from "../entities/trail-workflow-issue-row";
import { TrailCollectionRow } from "../patterns/trail-collection-row";
import { TrailGroupHeader } from "../patterns/trail-group-header";
import {
  TRAIL_FOUNDATION_CONFIGURATION,
  TRAIL_FOUNDATION_REFERENCE_TIMESTAMP,
} from "./trail-foundation-fixtures";
import { LabSpecimenRow } from "./trail-lab-showroom";

interface TrailWorkflowStatusRowFixture {
  readonly category: TrailStatusCategory;
  readonly id: string;
  readonly label: string;
  readonly title: string;
}

const WORKFLOW_STATUS_ROWS: readonly TrailWorkflowStatusRowFixture[] = [
  {
    category: "backlog",
    id: "TRAIL-241",
    label: "Backlog",
    title: "Capture a rough planning idea",
  },
  {
    category: "unstarted",
    id: "TRAIL-242",
    label: "Todo",
    title: "Prepare the next implementation slice",
  },
  {
    category: "started",
    id: "TRAIL-243",
    label: "In Progress",
    title: "Calibrate the Projects scanning hierarchy",
  },
  {
    category: "completed",
    id: "TRAIL-244",
    label: "Done",
    title: "Close an accepted visual pass",
  },
  {
    category: "canceled",
    id: "TRAIL-245",
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

function TrailWorkflowStatusRow({
  category,
  id,
  label,
  title,
}: TrailWorkflowStatusRowFixture) {
  return (
    <TrailCollectionRow
      data-workflow-status-row="true"
      leading={<TrailStatusGlyph category={category} label={label} />}
    >
      <div className="trail-lab-list-row__content">
        <span className="trail-lab-list-row__id">{id}</span>
        <span className="trail-lab-list-row__primary">
          <span className="trail-lab-list-row__title">{title}</span>
        </span>
        <span aria-hidden="true" className="trail-lab-list-row__trailing" />
      </div>
    </TrailCollectionRow>
  );
}

export function TrailProjectProductionSpecimens() {
  const issueLabels = TRAIL_FOUNDATION_CONFIGURATION.labels.filter(({ id }) => (
    id === "foundation-design" || id === "foundation-navigation"
  ));

  return (
    <>
      <LabSpecimenRow
        description="Compact Workflow Issue rows use the Status glyph as the visible lifecycle identity without repeating its configured label as row text. The configured label remains the glyph's accessible name; Status-section text remains a separate structural responsibility."
        kind="state-gallery"
        owner="TrailStatusGlyph + TrailCollectionRow"
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
        description="The Project Workspace keeps lifecycle identity in the persistent Status section, while the production Issue row scans Priority, title, Milestone, Labels, Current Cycle, Estimate, and Due without inventing a second Status column."
        kind="composition-gallery"
        owner="TrailGroupHeader + TrailWorkflowIssueRow"
        title="Project workspace issue rows"
      >
        <div className="trail-lab-list">
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
            priority="urgent"
            timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
            title="Establish workspace page composition"
          />
          <TrailWorkflowIssueRow
            estimate="medium"
            labels={issueLabels.slice(0, 1)}
            priority="high"
            timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
            title="Validate interaction hierarchy under ordinary width pressure"
          />
          <TrailWorkflowIssueRow
            labels={[]}
            priority={undefined}
            timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
            title="Keep optional metadata quiet when absent"
          />
        </div>
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
          {PROJECT_ROWS.map((project) => (
            <TrailProjectSummaryRow
              due={project.due}
              key={project.title}
              priority={project.priority}
              progress={project.progress}
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
