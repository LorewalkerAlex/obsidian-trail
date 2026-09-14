import {
  TrailLifecycleWidget,
  type TrailLifecycleWidgetDay,
  type TrailLifecycleWidgetMonth,
} from "../pages/home/trail-lifecycle-widget";
import {
  TrailThisWeekWidget,
  type TrailThisWeekWidgetDay,
} from "../pages/home/trail-this-week-widget";
import {
  TrailWorkTrendWidget,
  type TrailWorkTrendWidgetDay,
} from "../pages/home/trail-work-trend-widget";
import { LabSpecimenRow } from "./trail-lab-showroom";

const THIS_WEEK_DAYS: readonly TrailThisWeekWidgetDay[] = [
  { dayOfMonth: 14, id: "2026-09-14", isToday: true, issueDueCount: 1, triageDueCount: 0, weekday: "Mon" },
  { dayOfMonth: 15, id: "2026-09-15", issueDueCount: 0, triageDueCount: 1, weekday: "Tue" },
  { dayOfMonth: 16, id: "2026-09-16", issueDueCount: 2, triageDueCount: 0, weekday: "Wed" },
  { dayOfMonth: 17, id: "2026-09-17", issueDueCount: 1, triageDueCount: 2, weekday: "Thu" },
  { dayOfMonth: 18, id: "2026-09-18", issueDueCount: 3, triageDueCount: 0, weekday: "Fri" },
  { dayOfMonth: 19, id: "2026-09-19", issueDueCount: 0, triageDueCount: 0, weekday: "Sat" },
  { dayOfMonth: 20, id: "2026-09-20", issueDueCount: 0, triageDueCount: 1, weekday: "Sun" },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const LIFECYCLE_START = Date.UTC(2025, 9, 1);
const LIFECYCLE_END = Date.UTC(2026, 8, 14);
const LIFECYCLE_START_MONDAY = Date.UTC(2025, 8, 29);
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function lifecycleCounts(index: number): Pick<TrailLifecycleWidgetDay, "createdCount" | "startedCount" | "terminalCount"> {
  const clustered = (index >= 58 && index <= 118) || (index >= 215 && index <= 292);

  return {
    createdCount: index % (clustered ? 6 : 11) === 0 ? (index % 33 === 0 ? 2 : 1) : 0,
    startedCount: index % (clustered ? 9 : 15) === 4 ? 1 : 0,
    terminalCount: index >= 28 && index % (clustered ? 13 : 21) === 7 ? 1 : 0,
  };
}

function buildLifecycleDays(): readonly TrailLifecycleWidgetDay[] {
  const days: TrailLifecycleWidgetDay[] = [];

  for (let timestamp = LIFECYCLE_START, index = 0; timestamp <= LIFECYCLE_END; timestamp += DAY_MS, index += 1) {
    const date = new Date(timestamp);
    const month = MONTH_NAMES[date.getUTCMonth()];
    const dayOfMonth = date.getUTCDate();
    const weekdayIndex = (date.getUTCDay() + 6) % 7;
    const weekIndex = Math.floor((timestamp - LIFECYCLE_START_MONDAY) / (7 * DAY_MS));

    days.push({
      ...lifecycleCounts(index),
      dateLabel: `${month} ${dayOfMonth}, ${date.getUTCFullYear()}`,
      id: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`,
      weekdayIndex,
      weekIndex,
    });
  }

  return days;
}

function buildLifecycleMonths(): readonly TrailLifecycleWidgetMonth[] {
  const months: TrailLifecycleWidgetMonth[] = [];
  let previousMonth = -1;

  for (let timestamp = LIFECYCLE_START; timestamp <= LIFECYCLE_END; timestamp += DAY_MS) {
    const date = new Date(timestamp);
    const month = date.getUTCMonth();
    if (month === previousMonth) continue;

    months.push({
      label: MONTH_NAMES[month],
      weekIndex: Math.floor((timestamp - LIFECYCLE_START_MONDAY) / (7 * DAY_MS)),
    });
    previousMonth = month;
  }

  return months;
}

const LIFECYCLE_DAYS = buildLifecycleDays();
const LIFECYCLE_MONTHS = buildLifecycleMonths();

function buildWorkTrendDays(): readonly TrailWorkTrendWidgetDay[] {
  const days: TrailWorkTrendWidgetDay[] = [];
  const completedWindow = [0, 0, 0, 0, 0, 0];
  let backlogStock = 8;
  let activeStock = 2;

  for (let timestamp = Date.UTC(2026, 6, 1), index = 0; timestamp <= Date.UTC(2026, 8, 14); timestamp += DAY_MS, index += 1) {
    if (index % 5 === 0) backlogStock += 1;
    if (index % 7 === 2 && backlogStock > 0) {
      backlogStock -= 1;
      activeStock += 1;
    }

    let completedToday = 0;
    if (index % 9 === 4 && activeStock > 0) {
      activeStock -= 1;
      completedToday += 1;
    }
    if (index % 23 === 11 && activeStock > 0) {
      activeStock -= 1;
      completedToday += 1;
    }
    if (timestamp === Date.UTC(2026, 8, 14) && activeStock > 0) {
      activeStock -= 1;
      completedToday += 1;
    }

    completedWindow.push(completedToday);
    if (completedWindow.length > 7) completedWindow.shift();

    const date = new Date(timestamp);
    const month = MONTH_NAMES[date.getUTCMonth()];
    const dayOfMonth = date.getUTCDate();

    days.push({
      activeStock,
      backlogStock,
      completed7dCount: completedWindow.reduce((sum, value) => sum + value, 0),
      dateLabel: `${month} ${dayOfMonth}, ${date.getUTCFullYear()}`,
      id: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`,
    });
  }

  return days;
}

const WORK_TREND_DAYS = buildWorkTrendDays();

export function TrailHomeWidgetSpecimens() {
  return (
    <>
      <LabSpecimenRow
        description="This week stays at 1×1 and follows the Home chart family: strong title, quiet month context, date-first scanning, low-noise zero states, and a restrained current-day marker instead of a table-like selected column."
        kind="composition-gallery"
        owner="TrailHomeWidgetFrame + TrailThisWeekWidget"
        title="Home widget · This week · 1×1 typography candidate"
      >
        <div className="trail-home-widget-candidate">
          <TrailThisWeekWidget days={THIS_WEEK_DAYS} monthLabel="Sep" />
        </div>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="Annual geometry remains a Foundation-only visual study; the accepted product horizon is still rolling three calendar months. The study now treats the activity field as the content: empty cells recede, intensity carries the shape, labels stay quiet, and exact Created/Started/Terminal counts remain on each focusable day."
        kind="composition-gallery"
        owner="TrailHomeWidgetFrame + TrailLifecycleWidget"
        title="Home widget · Lifecycle · full-row annual candidate"
      >
        <div className="trail-home-widget-banner-candidate">
          <TrailLifecycleWidget
            days={LIFECYCLE_DAYS}
            months={LIFECYCLE_MONTHS}
          />
        </div>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="The size study resolves at 2×1: the wide footprint already makes the inventory/throughput relationship readable, while 2×2 only magnifies the same information. Backlog + Active share the upper stock field, Completed uses a rolling 7-day sum below the shared time axis, and exact values appear only at the hovered or focused date."
        kind="composition-gallery"
        owner="TrailHomeWidgetFrame + TrailWorkTrendWidget"
        title="Home widget · Work trend · 2×1 candidate"
      >
        <div className="trail-home-widget-work-trend-candidate">
          <TrailWorkTrendWidget
            days={WORK_TREND_DAYS}
            hasHistory
            rangeLabel="Jul–Sep"
          />
        </div>
      </LabSpecimenRow>
    </>
  );
}
