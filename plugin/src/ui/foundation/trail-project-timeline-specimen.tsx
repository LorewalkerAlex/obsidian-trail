import type { TrailProjectTimelineRow } from "../pages/projects/trail-project-timeline";
import { TrailProjectTimeline } from "../pages/projects/trail-project-timeline";
import { TRAIL_FOUNDATION_REFERENCE_TIMESTAMP } from "./trail-foundation-fixtures";
import { LabSpecimenRow } from "./trail-lab-showroom";

const DAY_MS = 24 * 60 * 60 * 1000;
const TODAY = TRAIL_FOUNDATION_REFERENCE_TIMESTAMP;

const TIMELINE_ROWS: readonly TrailProjectTimelineRow[] = [
  {
    dueMarkers: [
      {
        id: "timeline-overdue-issue",
        kind: "issue",
        label: "Issue due Aug 28 · overdue",
        overdue: true,
        timestamp: TODAY - (15 * DAY_MS),
      },
      {
        id: "timeline-milestone-due",
        kind: "milestone",
        label: "Milestone due Sep 25",
        timestamp: TODAY + (13 * DAY_MS),
      },
      {
        id: "timeline-project-due",
        kind: "project",
        label: "Project due Oct 16",
        timestamp: TODAY + (34 * DAY_MS),
      },
    ],
    futureSpan: {
      end: TODAY + (34 * DAY_MS),
      start: TODAY,
    },
    historicalSpan: {
      end: TODAY,
      kind: "execution",
      start: TODAY - (54 * DAY_MS),
    },
    id: "foundation-timeline-execution",
    statusCategory: "started",
    statusLabel: "In Progress",
    title: "Ship the Projects workspace",
  },
  {
    dueMarkers: [
      {
        id: "timeline-planned-project-due",
        kind: "project",
        label: "Project due Oct 6",
        timestamp: TODAY + (24 * DAY_MS),
      },
    ],
    futureSpan: {
      end: TODAY + (24 * DAY_MS),
      start: TODAY,
    },
    historicalSpan: {
      end: TODAY + (24 * DAY_MS),
      kind: "planning",
      start: TODAY - (29 * DAY_MS),
    },
    id: "foundation-timeline-planning",
    statusCategory: "unstarted",
    statusLabel: "Planned",
    title: "Prepare the next product planning pass",
  },
  {
    dueMarkers: [],
    historicalSpan: {
      end: TODAY - (21 * DAY_MS),
      kind: "planning",
      start: TODAY - (69 * DAY_MS),
    },
    id: "foundation-timeline-closed",
    statusCategory: "completed",
    statusLabel: "Completed",
    title: "Close the previous design-system checkpoint",
  },
];

function TimelineFixture({ label }: { readonly label: string }) {
  return (
    <TrailProjectTimeline
      label={label}
      onProjectActivate={() => undefined}
      rangeEnd={TODAY + (64 * DAY_MS)}
      rangeStart={TODAY - (73 * DAY_MS)}
      rows={TIMELINE_ROWS}
      timezone="UTC"
      today={TODAY}
    />
  );
}

export function TrailProjectTimelineSpecimen() {
  return (
    <LabSpecimenRow
      description="Resolved Project spans and Due markers at month scale; the second viewport proves Timeline-owned horizontal scroll."
      kind="composition-gallery"
      owner="TrailProjectTimeline"
      title="Project timeline"
    >
      <div style={{ display: "grid", gap: "24px" }}>
        <div>
          <div className="trail-lab-type-meta" style={{ marginBottom: "6px" }}>Representative month scale</div>
          <TimelineFixture label="Representative Project timeline" />
        </div>
        <div data-timeline-constraint="true" style={{ maxWidth: "420px", width: "100%" }}>
          <div className="trail-lab-type-meta" style={{ marginBottom: "6px" }}>Constrained viewport · Timeline scroll owner</div>
          <TimelineFixture label="Constrained Project timeline" />
        </div>
      </div>
    </LabSpecimenRow>
  );
}
