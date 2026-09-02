import type { TrailLocation } from "../../ui/shell/trail-navigation-state";

export interface TrailViewState extends Record<string, unknown> {
  readonly location: TrailLocation;
}

export function createTrailViewState(location: TrailLocation): TrailViewState {
  return { location };
}

export function readTrailViewState(state: unknown): TrailViewState {
  if (typeof state !== "object" || state === null) {
    return createTrailViewState({ kind: "home" });
  }

  const location = (state as { readonly location?: unknown }).location;
  if (typeof location !== "object" || location === null) {
    return createTrailViewState({ kind: "home" });
  }

  const record = location as {
    readonly initiativeId?: unknown;
    readonly kind?: unknown;
    readonly projectId?: unknown;
  };

  switch (record.kind) {
    case "cycles":
    case "home":
    case "projects":
    case "search":
    case "triage":
      return createTrailViewState({ kind: record.kind });
    case "initiative":
      return typeof record.initiativeId === "string" && record.initiativeId.trim() !== ""
        ? createTrailViewState({ initiativeId: record.initiativeId, kind: "initiative" })
        : createTrailViewState({ kind: "home" });
    case "project":
      return typeof record.projectId === "string" && record.projectId.trim() !== ""
        ? createTrailViewState({ kind: "project", projectId: record.projectId })
        : createTrailViewState({ kind: "home" });
    default:
      return createTrailViewState({ kind: "home" });
  }
}
