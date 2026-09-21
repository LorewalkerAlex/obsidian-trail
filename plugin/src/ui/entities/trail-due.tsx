import type { TrailTimestamp } from "../../domain/model/trail-values";
import { formatTrailCalendarDate } from "../../domain/rules/trail-calendar-date";

export interface TrailDueDateProps {
  readonly timestamp: TrailTimestamp;
  readonly timezone: string;
}

function formatLongDueDate(
  timestamp: TrailTimestamp,
  timezone: string,
): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: timezone,
    year: "numeric",
  }).format(timestamp);
}

export function TrailDueDate({
  timestamp,
  timezone,
}: TrailDueDateProps) {
  const accessibleLabel = formatLongDueDate(timestamp, timezone);
  return (
    <time
      aria-label={accessibleLabel}
      className="trail-due-date"
      dateTime={new Date(timestamp).toISOString()}
      title={accessibleLabel}
    >
      {formatTrailCalendarDate(timestamp, timezone)}
    </time>
  );
}
