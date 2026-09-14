import type { CSSProperties } from "react";

import {
  TrailHomeWidgetFrame,
} from "./trail-home-widget-frame";

export interface TrailWorkTrendWidgetDay {
  readonly activeStock: number;
  readonly backlogStock: number;
  readonly completedFlow: number;
  readonly dateLabel: string;
  readonly id: string;
}

function seriesPath(
  days: readonly TrailWorkTrendWidgetDay[],
  read: (day: TrailWorkTrendWidgetDay) => number,
  max: number,
): string {
  if (days.length === 0) return "";

  return days.map((day, index) => {
    const x = days.length === 1 ? 0 : (index / (days.length - 1)) * 100;
    const y = max === 0 ? 88 : 88 - (read(day) / max) * 76;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function dayDetail(day: TrailWorkTrendWidgetDay): string {
  return `${day.dateLabel}: Backlog ${day.backlogStock}, Active ${day.activeStock}, Completed ${day.completedFlow}`;
}

function TrendMetric({
  label,
  series,
  value,
}: {
  readonly label: string;
  readonly series: "active" | "backlog" | "completed";
  readonly value: number;
}) {
  return (
    <span className="trail-home-work-trend__metric">
      <i aria-hidden="true" data-series={series} />
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

export function TrailWorkTrendWidget({
  days,
  size,
}: {
  readonly days: readonly TrailWorkTrendWidgetDay[];
  readonly size: "large" | "wide";
}) {
  const latest = days[days.length - 1];
  const maxStock = Math.max(
    1,
    ...days.flatMap((day) => [day.backlogStock, day.activeStock]),
  );
  const maxFlow = Math.max(1, ...days.map((day) => day.completedFlow));

  return (
    <TrailHomeWidgetFrame meta="Jul–Sep" size={size} title="Work trend">
      <div className="trail-home-work-trend">
        <div className="trail-home-work-trend__metrics" aria-label="Current work trend values">
          <TrendMetric label="Backlog" series="backlog" value={latest?.backlogStock ?? 0} />
          <TrendMetric label="Active" series="active" value={latest?.activeStock ?? 0} />
          <TrendMetric label="Completed today" series="completed" value={latest?.completedFlow ?? 0} />
        </div>

        <div className="trail-home-work-trend__chart">
          <svg
            aria-label="Work trend chart"
            className="trail-home-work-trend__svg"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 100 100"
          >
            <line className="trail-home-work-trend__guide" x1="0" x2="100" y1="24" y2="24" />
            <line className="trail-home-work-trend__guide" x1="0" x2="100" y1="50" y2="50" />
            <line className="trail-home-work-trend__guide" x1="0" x2="100" y1="76" y2="76" />

            {days.map((day, index) => {
              if (day.completedFlow === 0) return null;
              const x = days.length === 0 ? 0 : (index / days.length) * 100;
              const width = Math.max(0.5, 70 / Math.max(1, days.length));
              const height = (day.completedFlow / maxFlow) * 22;

              return (
                <rect
                  className="trail-home-work-trend__flow"
                  height={height}
                  key={day.id}
                  width={width}
                  x={x}
                  y={90 - height}
                />
              );
            })}

            <path
              className="trail-home-work-trend__line"
              data-series="backlog"
              d={seriesPath(days, (day) => day.backlogStock, maxStock)}
            />
            <path
              className="trail-home-work-trend__line"
              data-series="active"
              d={seriesPath(days, (day) => day.activeStock, maxStock)}
            />
          </svg>

          <div className="trail-home-work-trend__focus-layer" aria-label="Work trend daily values">
            {days.map((day, index) => (
              <span
                aria-label={dayDetail(day)}
                className="trail-home-work-trend__focus-day"
                key={day.id}
                style={{
                  "--trail-home-work-trend-index": index,
                  "--trail-home-work-trend-total": days.length,
                } as CSSProperties}
                tabIndex={0}
                title={dayDetail(day)}
              />
            ))}
          </div>
        </div>
      </div>
    </TrailHomeWidgetFrame>
  );
}
