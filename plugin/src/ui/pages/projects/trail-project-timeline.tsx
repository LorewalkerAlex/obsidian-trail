import type {
  TrailProjectId,
  TrailProjectStatusCategory,
  TrailTimestamp,
} from "../../../domain/model/trail-values";
import { TrailStatusGlyph } from "../../entities/trail-status";

const DAY_MS = 24 * 60 * 60 * 1000;
const PIXELS_PER_DAY = 6;
const MIN_CANVAS_WIDTH = 720;

export type TrailProjectTimelineDueKind = "issue" | "milestone" | "project";

export interface TrailProjectTimelineDueMarker {
  readonly id: string;
  readonly kind: TrailProjectTimelineDueKind;
  readonly label: string;
  readonly overdue?: boolean;
  readonly timestamp: TrailTimestamp;
}

export interface TrailProjectTimelineHistoricalSpan {
  readonly end: TrailTimestamp;
  readonly kind: "execution" | "planning";
  readonly start: TrailTimestamp;
}

export interface TrailProjectTimelineFutureSpan {
  readonly end: TrailTimestamp;
  readonly start: TrailTimestamp;
}

export interface TrailProjectTimelineRow {
  readonly dueMarkers: readonly TrailProjectTimelineDueMarker[];
  readonly futureSpan?: TrailProjectTimelineFutureSpan;
  readonly historicalSpan?: TrailProjectTimelineHistoricalSpan;
  readonly id: TrailProjectId;
  readonly statusCategory: TrailProjectStatusCategory;
  readonly statusLabel: string;
  readonly title: string;
}

export interface TrailProjectTimelineProps {
  readonly label: string;
  readonly onProjectActivate?: (projectId: TrailProjectId) => void;
  readonly rangeEnd: TrailTimestamp;
  readonly rangeStart: TrailTimestamp;
  readonly rows: readonly TrailProjectTimelineRow[];
  readonly timezone: string;
  readonly today: TrailTimestamp;
}

interface TrailTimelineIntervalGeometry {
  readonly left: number;
  readonly width: number;
}

interface TrailTimelineAxisTick {
  readonly day: number;
  readonly label: string;
}

function createCalendarDayFormatter(timezone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: timezone,
    year: "numeric",
  });
}

function toCalendarDay(
  timestamp: TrailTimestamp,
  formatter: Intl.DateTimeFormat,
): number {
  const parts = Object.fromEntries(
    formatter.formatToParts(timestamp).map(({ type, value }) => [type, value]),
  );

  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
  ) / DAY_MS;
}

function calendarDayDate(day: number): Date {
  return new Date(day * DAY_MS);
}

function monthLabel(day: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(calendarDayDate(day)).toUpperCase();
}

function longDateLabel(day: number): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(calendarDayDate(day));
}

function compactDateLabel(day: number): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(calendarDayDate(day)).toUpperCase();
}

function timelinePercent(day: number, rangeStartDay: number, rangeDays: number): number {
  return ((day - rangeStartDay) / rangeDays) * 100;
}

function intervalGeometry(
  startDay: number,
  endDay: number,
  rangeStartDay: number,
  rangeEndDay: number,
): TrailTimelineIntervalGeometry | undefined {
  const clippedStart = Math.max(startDay, rangeStartDay);
  const clippedEnd = Math.min(endDay, rangeEndDay);

  if (clippedEnd <= clippedStart) {
    return undefined;
  }

  const rangeDays = rangeEndDay - rangeStartDay;
  return {
    left: timelinePercent(clippedStart, rangeStartDay, rangeDays),
    width: ((clippedEnd - clippedStart) / rangeDays) * 100,
  };
}

function collectAxisTicks(
  rangeStartDay: number,
  rangeEndDay: number,
): {
  readonly months: readonly TrailTimelineAxisTick[];
  readonly weeks: readonly TrailTimelineAxisTick[];
} {
  const months: TrailTimelineAxisTick[] = [];
  const weeks: TrailTimelineAxisTick[] = [];

  for (let day = rangeStartDay; day < rangeEndDay; day += 1) {
    const date = calendarDayDate(day);

    if (date.getUTCDate() === 1) {
      months.push({ day, label: monthLabel(day) });
    }

    if (date.getUTCDay() === 1) {
      weeks.push({ day, label: String(date.getUTCDate()) });
    }
  }

  return { months, weeks };
}

function clippedIntervalStartDay(
  start: TrailTimestamp,
  end: TrailTimestamp,
  formatter: Intl.DateTimeFormat,
  rangeStartDay: number,
  rangeEndDay: number,
): number | undefined {
  const startDay = toCalendarDay(start, formatter);
  const endDay = toCalendarDay(end, formatter);

  if (endDay <= rangeStartDay || startDay >= rangeEndDay || endDay <= startDay) {
    return undefined;
  }

  return Math.max(startDay, rangeStartDay);
}

function rowAnchorDay(
  row: TrailProjectTimelineRow,
  formatter: Intl.DateTimeFormat,
  rangeStartDay: number,
  rangeEndDay: number,
): number {
  const candidates: number[] = [];

  if (row.historicalSpan !== undefined) {
    const clippedStart = clippedIntervalStartDay(
      row.historicalSpan.start,
      row.historicalSpan.end,
      formatter,
      rangeStartDay,
      rangeEndDay,
    );
    if (clippedStart !== undefined) {
      candidates.push(clippedStart);
    }
  }

  if (row.futureSpan !== undefined) {
    const clippedStart = clippedIntervalStartDay(
      row.futureSpan.start,
      row.futureSpan.end,
      formatter,
      rangeStartDay,
      rangeEndDay,
    );
    if (clippedStart !== undefined) {
      candidates.push(clippedStart);
    }
  }

  for (const marker of row.dueMarkers) {
    const markerDay = toCalendarDay(marker.timestamp, formatter);
    if (markerDay >= rangeStartDay && markerDay < rangeEndDay) {
      candidates.push(markerDay);
    }
  }

  return candidates.length === 0 ? rangeStartDay : Math.min(...candidates);
}

function TrailProjectTimelineRowView({
  formatter,
  onProjectActivate,
  rangeEndDay,
  rangeStartDay,
  row,
}: {
  readonly formatter: Intl.DateTimeFormat;
  readonly onProjectActivate?: (projectId: TrailProjectId) => void;
  readonly rangeEndDay: number;
  readonly rangeStartDay: number;
  readonly row: TrailProjectTimelineRow;
}) {
  const rangeDays = rangeEndDay - rangeStartDay;
  const anchorDay = rowAnchorDay(row, formatter, rangeStartDay, rangeEndDay);
  const anchorLeft = Math.max(0, Math.min(100, timelinePercent(anchorDay, rangeStartDay, rangeDays)));
  const historicalSpan = row.historicalSpan;
  const historicalGeometry = historicalSpan === undefined
    ? undefined
    : intervalGeometry(
        toCalendarDay(historicalSpan.start, formatter),
        toCalendarDay(historicalSpan.end, formatter),
        rangeStartDay,
        rangeEndDay,
      );
  const futureGeometry = row.futureSpan === undefined
    ? undefined
    : intervalGeometry(
        toCalendarDay(row.futureSpan.start, formatter),
        toCalendarDay(row.futureSpan.end, formatter),
        rangeStartDay,
        rangeEndDay,
      );
  const activate = onProjectActivate === undefined
    ? undefined
    : () => onProjectActivate(row.id);

  return (
    <div
      aria-label={`${row.title}, ${row.statusLabel}`}
      className="trail-project-timeline__row"
      data-project-timeline-row="true"
      role="listitem"
    >
      <div
        className="trail-project-timeline__project-label"
        style={{
          left: `${anchorLeft}%`,
          maxWidth: `${Math.max(12, 100 - anchorLeft)}%`,
        }}
      >
        <TrailStatusGlyph
          category={row.statusCategory}
          decorative
          entityType="project"
        />
        {activate === undefined ? (
          <span className="trail-project-timeline__project-title">{row.title}</span>
        ) : (
          <button
            className="trail-project-timeline__project-title trail-project-timeline__project-title-button"
            onClick={activate}
            type="button"
          >
            {row.title}
          </button>
        )}
      </div>

      {historicalGeometry === undefined || historicalSpan === undefined ? null : (
        <span
          aria-hidden="true"
          className="trail-project-timeline__span"
          data-span-kind={historicalSpan.kind}
          style={{
            left: `${historicalGeometry.left}%`,
            width: `${historicalGeometry.width}%`,
          }}
        />
      )}

      {futureGeometry === undefined ? null : (
        <span
          aria-hidden="true"
          className="trail-project-timeline__span trail-project-timeline__span--future"
          data-span-kind="future"
          style={{
            left: `${futureGeometry.left}%`,
            width: `${futureGeometry.width}%`,
          }}
        />
      )}

      {row.dueMarkers.map((marker) => {
        const markerDay = toCalendarDay(marker.timestamp, formatter);
        if (markerDay < rangeStartDay || markerDay >= rangeEndDay) {
          return null;
        }

        const left = timelinePercent(markerDay, rangeStartDay, rangeDays);
        return (
          <span
            aria-label={marker.label}
            className="trail-project-timeline__due-marker"
            data-due-kind={marker.kind}
            data-overdue={marker.overdue === true ? "true" : undefined}
            key={marker.id}
            role="img"
            style={{ left: `${left}%` }}
            title={marker.label}
          />
        );
      })}
    </div>
  );
}

export function TrailProjectTimeline({
  label,
  onProjectActivate,
  rangeEnd,
  rangeStart,
  rows,
  timezone,
  today,
}: TrailProjectTimelineProps) {
  const formatter = createCalendarDayFormatter(timezone);
  const rangeStartDay = toCalendarDay(rangeStart, formatter);
  const rangeEndDay = Math.max(rangeStartDay + 1, toCalendarDay(rangeEnd, formatter));
  const rangeDays = rangeEndDay - rangeStartDay;
  const todayDay = toCalendarDay(today, formatter);
  const todayVisible = todayDay >= rangeStartDay && todayDay < rangeEndDay;
  const todayLeft = timelinePercent(todayDay, rangeStartDay, rangeDays);
  const ticks = collectAxisTicks(rangeStartDay, rangeEndDay);
  const canvasWidth = Math.max(MIN_CANVAS_WIDTH, Math.ceil(rangeDays * PIXELS_PER_DAY));
  const rangeLabel = `${longDateLabel(rangeStartDay)} to ${longDateLabel(rangeEndDay)}`;

  return (
    <div className="trail-project-timeline" data-project-timeline="true">
      <div
        aria-label={`${label}, ${rangeLabel}`}
        className="trail-project-timeline__scroller"
        role="region"
        tabIndex={0}
      >
        <div
          className="trail-project-timeline__canvas"
          style={{ width: `${canvasWidth}px` }}
        >
          <div aria-hidden="true" className="trail-project-timeline__grid">
            {ticks.weeks.map((tick) => {
              const left = timelinePercent(tick.day, rangeStartDay, rangeDays);
              return (
                <span
                  className="trail-project-timeline__grid-line trail-project-timeline__grid-line--week"
                  key={`week-line-${tick.day}`}
                  style={{ left: `${left}%` }}
                />
              );
            })}
            {ticks.months.map((tick) => {
              const left = timelinePercent(tick.day, rangeStartDay, rangeDays);
              return (
                <span
                  className="trail-project-timeline__grid-line trail-project-timeline__grid-line--month"
                  key={`month-line-${tick.day}`}
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>

          <div aria-hidden="true" className="trail-project-timeline__axis">
            <div className="trail-project-timeline__month-labels">
              {ticks.months.map((tick) => (
                <span
                  className="trail-project-timeline__month-label"
                  key={`month-label-${tick.day}`}
                  style={{ left: `${timelinePercent(tick.day, rangeStartDay, rangeDays)}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
            <div className="trail-project-timeline__week-labels">
              {ticks.weeks.map((tick) => (
                <span
                  className="trail-project-timeline__week-label"
                  key={`week-label-${tick.day}`}
                  style={{ left: `${timelinePercent(tick.day, rangeStartDay, rangeDays)}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          </div>

          <div className="trail-project-timeline__rows" role="list">
            {rows.map((row) => (
              <TrailProjectTimelineRowView
                formatter={formatter}
                key={row.id}
                onProjectActivate={onProjectActivate}
                rangeEndDay={rangeEndDay}
                rangeStartDay={rangeStartDay}
                row={row}
              />
            ))}
          </div>

          {todayVisible ? (
            <div
              aria-label={`Today, ${longDateLabel(todayDay)}`}
              className="trail-project-timeline__today"
              role="img"
              style={{ left: `${todayLeft}%` }}
            >
              <span className="trail-project-timeline__today-label">
                {compactDateLabel(todayDay)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
