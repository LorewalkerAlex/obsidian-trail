import type { CSSProperties } from "react";

import {
  TrailHomeWidgetFrame,
} from "./trail-home-widget-frame";

export interface TrailLifecycleWidgetDay {
  readonly createdCount: number;
  readonly dateLabel: string;
  readonly id: string;
  readonly startedCount: number;
  readonly terminalCount: number;
  readonly weekIndex: number;
  readonly weekdayIndex: number;
}

export interface TrailLifecycleWidgetMonth {
  readonly label: string;
  readonly weekIndex: number;
}

function activityLevel(day: TrailLifecycleWidgetDay): number {
  return Math.min(
    4,
    day.createdCount + day.startedCount + day.terminalCount,
  );
}

function activityDetail(day: TrailLifecycleWidgetDay): string {
  return `${day.dateLabel}: Created ${day.createdCount}, Started ${day.startedCount}, Terminal ${day.terminalCount}`;
}

export function TrailLifecycleWidget({
  days,
  months,
}: {
  readonly days: readonly TrailLifecycleWidgetDay[];
  readonly months: readonly TrailLifecycleWidgetMonth[];
}) {
  const weekCount = days.reduce(
    (count, day) => Math.max(count, day.weekIndex + 1),
    0,
  );
  const totalEvents = days.reduce(
    (count, day) => count + day.createdCount + day.startedCount + day.terminalCount,
    0,
  );

  return (
    <TrailHomeWidgetFrame meta={`${totalEvents} events`} size="banner" title="Lifecycle activity">
      <div className="trail-home-lifecycle">
        <div
          aria-label="Lifecycle activity calendar"
          className="trail-home-lifecycle__calendar"
          style={{ "--trail-home-lifecycle-weeks": weekCount } as CSSProperties}
        >
          <div aria-hidden="true" className="trail-home-lifecycle__months">
            {months.map((month) => (
              <span
                key={`${month.label}:${month.weekIndex}`}
                style={{ gridColumn: `${month.weekIndex + 1} / span 3` }}
              >
                {month.label}
              </span>
            ))}
          </div>

          <div aria-hidden="true" className="trail-home-lifecycle__weekdays">
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
            <span />
          </div>

          <div className="trail-home-lifecycle__cells">
            {days.map((day) => (
              <span
                aria-label={activityDetail(day)}
                className="trail-home-lifecycle__cell"
                data-level={activityLevel(day)}
                key={day.id}
                style={{
                  gridColumn: day.weekIndex + 1,
                  gridRow: day.weekdayIndex + 1,
                }}
                tabIndex={0}
                title={activityDetail(day)}
              />
            ))}
          </div>
        </div>
      </div>
    </TrailHomeWidgetFrame>
  );
}
