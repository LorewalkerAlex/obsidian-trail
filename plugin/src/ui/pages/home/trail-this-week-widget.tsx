import {
  TrailHomeWidgetFrame,
} from "./trail-home-widget-frame";

export interface TrailThisWeekWidgetDay {
  readonly dayOfMonth: number;
  readonly id: string;
  readonly isToday?: boolean;
  readonly issueDueCount: number;
  readonly triageDueCount: number;
  readonly weekday: string;
}

function dueDetail(
  day: TrailThisWeekWidgetDay,
  monthLabel: string,
): string {
  return `${day.weekday} ${monthLabel} ${day.dayOfMonth}: ${day.triageDueCount} Triage due, ${day.issueDueCount} Issues due`;
}

function DueCount({
  count,
  day,
  monthLabel,
  source,
}: {
  readonly count: number;
  readonly day: TrailThisWeekWidgetDay;
  readonly monthLabel: string;
  readonly source: "issue" | "triage";
}) {
  const sourceLabel = source === "triage" ? "Triage" : "Issues";
  const exact = `${day.weekday} ${monthLabel} ${day.dayOfMonth}: ${count} ${sourceLabel} due`;

  return (
    <span
      aria-label={exact}
      className="trail-home-this-week__count"
      data-source={source}
      data-today={day.isToday ? "true" : "false"}
      data-value={count}
      title={exact}
    >
      {count === 0 ? "-" : count}
    </span>
  );
}

export function TrailThisWeekWidget({
  days,
  monthLabel,
}: {
  readonly days: readonly TrailThisWeekWidgetDay[];
  readonly monthLabel: string;
}) {
  return (
    <TrailHomeWidgetFrame meta={monthLabel} size="compact" title="This week">
      <div className="trail-home-this-week" aria-label="Due this week" role="group">
        <span aria-hidden="true" className="trail-home-this-week__corner" />
        {days.map((day) => (
          <span
            aria-label={dueDetail(day, monthLabel)}
            className="trail-home-this-week__day"
            data-today={day.isToday ? "true" : "false"}
            key={`date:${day.id}`}
            tabIndex={0}
            title={dueDetail(day, monthLabel)}
          >
            <span className="trail-home-this-week__weekday">{day.weekday}</span>
            <strong>{day.dayOfMonth}</strong>
          </span>
        ))}

        <span className="trail-home-this-week__source-label">Triage</span>
        {days.map((day) => (
          <DueCount
            count={day.triageDueCount}
            day={day}
            key={`triage:${day.id}`}
            monthLabel={monthLabel}
            source="triage"
          />
        ))}

        <span className="trail-home-this-week__source-label">Issues</span>
        {days.map((day) => (
          <DueCount
            count={day.issueDueCount}
            day={day}
            key={`issue:${day.id}`}
            monthLabel={monthLabel}
            source="issue"
          />
        ))}
      </div>
    </TrailHomeWidgetFrame>
  );
}
