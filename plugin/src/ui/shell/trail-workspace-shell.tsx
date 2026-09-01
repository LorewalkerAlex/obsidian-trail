import type { ReactNode } from "react";

export function TrailLocationBar({
  title,
}: {
  readonly title: string;
}) {
  return (
    <header aria-label="Location" className="trail-location-bar">
      <h1 className="trail-location-bar__title">{title}</h1>
    </header>
  );
}

export function TrailWorkspaceShell({
  children,
  locationBar,
}: {
  readonly children: ReactNode;
  readonly locationBar: ReactNode;
}) {
  return (
    <div className="trail-workspace-shell">
      {locationBar}
      <div className="trail-workspace-shell__content">{children}</div>
    </div>
  );
}
