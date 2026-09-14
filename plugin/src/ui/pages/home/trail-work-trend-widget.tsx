import {
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import {
  TrailHomeWidgetFrame,
} from "./trail-home-widget-frame";

export interface TrailWorkTrendWidgetDay {
  readonly activeStock: number;
  readonly backlogStock: number;
  readonly completed7dCount: number;
  readonly dateLabel: string;
  readonly id: string;
}

const AXIS_Y = 58;
const STOCK_TOP_Y = 8;
const COMPLETED_BOTTOM_Y = 94;

function pointX(index: number, count: number): number {
  if (count <= 1) return 50;
  return (index / (count - 1)) * 100;
}

function stockY(value: number, max: number): number {
  return AXIS_Y - (value / max) * (AXIS_Y - STOCK_TOP_Y);
}

function completedY(value: number, max: number): number {
  return AXIS_Y + (value / max) * (COMPLETED_BOTTOM_Y - AXIS_Y);
}

function linePath(
  days: readonly TrailWorkTrendWidgetDay[],
  readY: (day: TrailWorkTrendWidgetDay) => number,
): string {
  return days.map((day, index) => {
    const x = pointX(index, days.length);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${readY(day).toFixed(2)}`;
  }).join(" ");
}

function areaToAxisPath(
  days: readonly TrailWorkTrendWidgetDay[],
  readY: (day: TrailWorkTrendWidgetDay) => number,
): string {
  if (days.length === 0) return "";

  const firstX = pointX(0, days.length);
  const lastX = pointX(days.length - 1, days.length);
  const series = days.map((day, index) => (
    `L${pointX(index, days.length).toFixed(2)},${readY(day).toFixed(2)}`
  )).join(" ");

  return `M${firstX.toFixed(2)},${AXIS_Y} ${series} L${lastX.toFixed(2)},${AXIS_Y} Z`;
}

function bandAreaPath(
  days: readonly TrailWorkTrendWidgetDay[],
  readOuterY: (day: TrailWorkTrendWidgetDay) => number,
  readInnerY: (day: TrailWorkTrendWidgetDay) => number,
): string {
  if (days.length === 0) return "";

  const outer = days.map((day, index) => (
    `${index === 0 ? "M" : "L"}${pointX(index, days.length).toFixed(2)},${readOuterY(day).toFixed(2)}`
  )).join(" ");
  const inner = [...days].reverse().map((day, reverseIndex) => {
    const index = days.length - 1 - reverseIndex;
    return `L${pointX(index, days.length).toFixed(2)},${readInnerY(day).toFixed(2)}`;
  }).join(" ");

  return `${outer} ${inner} Z`;
}

function dayDetail(day: TrailWorkTrendWidgetDay): string {
  return `${day.dateLabel}: Backlog ${day.backlogStock}, Active ${day.activeStock}, Completed 7d ${day.completed7dCount}`;
}

function TooltipRow({
  label,
  series,
  value,
}: {
  readonly label: string;
  readonly series: "active" | "backlog" | "completed";
  readonly value: number;
}) {
  return (
    <span className="trail-home-work-trend__tooltip-row">
      <i aria-hidden="true" data-series={series} />
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

export function TrailWorkTrendWidget({
  days,
}: {
  readonly days: readonly TrailWorkTrendWidgetDay[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const maxInventory = Math.max(
    1,
    ...days.map((day) => day.backlogStock + day.activeStock),
  );
  const maxCompleted7d = Math.max(1, ...days.map((day) => day.completed7dCount));
  const activeDay = activeIndex === null ? undefined : days[activeIndex];
  const activeX = activeIndex === null ? 0 : pointX(activeIndex, days.length);

  const inventoryPath = linePath(
    days,
    (day) => stockY(day.backlogStock + day.activeStock, maxInventory),
  );
  const activePath = linePath(
    days,
    (day) => stockY(day.activeStock, maxInventory),
  );
  const completedPath = linePath(
    days,
    (day) => completedY(day.completed7dCount, maxCompleted7d),
  );
  const backlogAreaPath = bandAreaPath(
    days,
    (day) => stockY(day.backlogStock + day.activeStock, maxInventory),
    (day) => stockY(day.activeStock, maxInventory),
  );
  const activeAreaPath = areaToAxisPath(
    days,
    (day) => stockY(day.activeStock, maxInventory),
  );
  const completedAreaPath = areaToAxisPath(
    days,
    (day) => completedY(day.completed7dCount, maxCompleted7d),
  );

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (days.length === 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;

    const ratio = Math.min(
      0.999999,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    );
    setActiveIndex(Math.floor(ratio * days.length));
  }

  return (
    <TrailHomeWidgetFrame meta="Jul–Sep" size="wide" title="Work trend">
      <div className="trail-home-work-trend">
        <div
          className="trail-home-work-trend__chart"
          onPointerLeave={() => setActiveIndex(null)}
          onPointerMove={handlePointerMove}
        >
          <svg
            aria-label="Work trend chart"
            className="trail-home-work-trend__svg"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 100 100"
          >
            <path
              className="trail-home-work-trend__area"
              data-series="backlog"
              d={backlogAreaPath}
            />
            <path
              className="trail-home-work-trend__area"
              data-series="active"
              d={activeAreaPath}
            />
            <path
              className="trail-home-work-trend__area"
              data-series="completed"
              d={completedAreaPath}
            />

            <line
              className="trail-home-work-trend__axis"
              x1="0"
              x2="100"
              y1={AXIS_Y}
              y2={AXIS_Y}
            />

            <path
              className="trail-home-work-trend__line"
              data-series="inventory"
              d={inventoryPath}
            />
            <path
              className="trail-home-work-trend__line"
              data-series="active"
              d={activePath}
            />
            <path
              className="trail-home-work-trend__line"
              data-series="completed"
              d={completedPath}
            />

            {activeIndex === null ? null : (
              <line
                className="trail-home-work-trend__cursor"
                x1={activeX}
                x2={activeX}
                y1="4"
                y2="96"
              />
            )}
          </svg>

          <div className="trail-home-work-trend__focus-layer" aria-label="Work trend daily values">
            {days.map((day, index) => (
              <span
                className="trail-home-work-trend__focus-day"
                key={day.id}
                onBlur={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                style={{
                  "--trail-home-work-trend-index": index,
                  "--trail-home-work-trend-total": days.length,
                } as CSSProperties}
                tabIndex={0}
              >
                <span className="trail-home-work-trend__sr-only">{dayDetail(day)}</span>
              </span>
            ))}
          </div>

          {activeDay === undefined ? null : (
            <div
              aria-hidden="true"
              className="trail-home-work-trend__tooltip"
              data-side={activeX > 62 ? "left" : "right"}
              style={{ "--trail-home-work-trend-x": `${activeX}%` } as CSSProperties}
            >
              <span className="trail-home-work-trend__tooltip-date">{activeDay.dateLabel}</span>
              <TooltipRow label="Backlog" series="backlog" value={activeDay.backlogStock} />
              <TooltipRow label="Active" series="active" value={activeDay.activeStock} />
              <TooltipRow label="Completed 7d" series="completed" value={activeDay.completed7dCount} />
            </div>
          )}
        </div>
      </div>
    </TrailHomeWidgetFrame>
  );
}
