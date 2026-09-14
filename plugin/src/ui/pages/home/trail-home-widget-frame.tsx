import type { ReactNode } from "react";

export type TrailHomeWidgetSize = "banner" | "compact" | "large" | "tall" | "wide";

export function TrailHomeWidgetFrame({
  children,
  meta,
  size,
  title,
}: {
  readonly children: ReactNode;
  readonly meta?: ReactNode;
  readonly size: TrailHomeWidgetSize;
  readonly title: string;
}) {
  return (
    <section
      aria-label={title}
      className="trail-home-widget"
      data-home-widget-size={size}
    >
      <header className="trail-home-widget__header">
        <h3 className="trail-home-widget__title">{title}</h3>
        {meta === undefined ? null : (
          <div className="trail-home-widget__meta">{meta}</div>
        )}
      </header>
      <div className="trail-home-widget__content">{children}</div>
    </section>
  );
}
