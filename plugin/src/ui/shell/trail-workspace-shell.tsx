import type { ReactNode } from "react";

export type TrailPageSurfaceInset = "none" | "page";
export type TrailPageSurfaceScroll = "nested" | "page";

/** Mechanical Main View frame. Page identity and actions stay with the Page. */
export function TrailWorkspaceFrame({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <div className="trail-workspace-frame">{children}</div>;
}

/** Shared Main View capacity, responsive context, insets, and scroll boundary. */
export function TrailPageSurface({
  children,
  inset = "none",
  scroll = "nested",
}: {
  readonly children: ReactNode;
  readonly inset?: TrailPageSurfaceInset;
  readonly scroll?: TrailPageSurfaceScroll;
}) {
  return (
    <div
      className="trail-page-surface"
      data-inset={inset}
      data-scroll={scroll}
    >
      {children}
    </div>
  );
}
