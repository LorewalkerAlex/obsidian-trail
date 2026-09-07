import type {
  TrailProjectStatusCategory,
  TrailStatusCategory,
} from "../../domain/model/trail-values";
import { TrailProjectSummaryRow } from "../entities/trail-project-summary-row";
import { TrailStatusGlyph } from "../entities/trail-status";
import {
  TRAIL_FOUNDATION_CONFIGURATION,
  TRAIL_FOUNDATION_REFERENCE_TIMESTAMP,
} from "./trail-foundation-fixtures";
import {
  LabControlGroup,
  LabSpecimenRow,
} from "./trail-lab-showroom";

const STATUS_CASES = [
  ["backlog", "Backlog"],
  ["unstarted", "Todo"],
  ["started", "In Progress"],
  ["completed", "Done"],
  ["canceled", "Canceled"],
] as const satisfies readonly (readonly [TrailStatusCategory, string])[];

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

export function TrailProjectProductionSpecimens() {
  return (
    <>
      <LabSpecimenRow
        description="Status Category owns the glyph identity while configured names remain explicit presentation input. The five lifecycle categories are visible together without inventing a Status picker."
        kind="state-gallery"
        owner="TrailStatusGlyph"
        title="Status presentation"
      >
        {STATUS_CASES.map(([category, label]) => (
          <LabControlGroup key={category} label={label}>
            <TrailStatusGlyph category={category} label={label} />
          </LabControlGroup>
        ))}
      </LabSpecimenRow>

      <LabSpecimenRow
        description="The production Projects scanning row keeps title strongest and reuses Status, Priority, Progress, and Due owners. Representative actionable, planned, completed, canceled, and unavailable states are fixture-driven only."
        kind="composition-gallery"
        owner="TrailProjectSummaryRow"
        title="Project summary row"
      >
        <div className="trail-lab-list">
          <div className="trail-lab-list__header">
            <span>Initiative Alpha</span>
            <span>4 projects</span>
          </div>
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
