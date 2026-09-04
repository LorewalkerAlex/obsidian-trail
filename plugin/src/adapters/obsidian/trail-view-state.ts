import { TRAIL_DEVELOPMENT_UI_ENABLED } from "../../trail-build-flags";
import type { TrailLocation } from "../../ui/shell/trail-navigation-state";

export interface TrailViewState extends Record<string, unknown> {
  readonly location: TrailLocation;
}

export interface TrailViewStateOptions {
  readonly allowDevelopment?: boolean;
}

function developmentAllowed(options: TrailViewStateOptions): boolean {
  return options.allowDevelopment ?? TRAIL_DEVELOPMENT_UI_ENABLED;
}

export function createTrailViewState(
  location: TrailLocation,
  options: TrailViewStateOptions = {},
): TrailViewState {
  if (location.kind === "foundation" && !developmentAllowed(options)) {
    return { location: { kind: "home" } };
  }
  return { location };
}

export function readTrailViewState(
  state: unknown,
  options: TrailViewStateOptions = {},
): TrailViewState {
  if (typeof state !== "object" || state === null) {
    return createTrailViewState({ kind: "home" }, options);
  }

  const location = (state as { readonly location?: unknown }).location;
  if (typeof location !== "object" || location === null) {
    return createTrailViewState({ kind: "home" }, options);
  }

  const record = location as {
    readonly cycleId?: unknown;
    readonly initiativeId?: unknown;
    readonly issueId?: unknown;
    readonly kind?: unknown;
    readonly projectId?: unknown;
  };

  switch (record.kind) {
    case "cycles":
    case "home":
    case "projects":
    case "triage":
      return createTrailViewState({ kind: record.kind }, options);
    case "foundation":
      return createTrailViewState({ kind: "foundation" }, options);
    case "cycle":
      return typeof record.cycleId === "string" && record.cycleId.trim() !== ""
        ? createTrailViewState({ cycleId: record.cycleId, kind: "cycle" }, options)
        : createTrailViewState({ kind: "home" }, options);
    case "initiative":
      return typeof record.initiativeId === "string" && record.initiativeId.trim() !== ""
        ? createTrailViewState({ initiativeId: record.initiativeId, kind: "initiative" }, options)
        : createTrailViewState({ kind: "home" }, options);
    case "issue":
      return typeof record.issueId === "string" && record.issueId.trim() !== ""
        ? createTrailViewState({ issueId: record.issueId, kind: "issue" }, options)
        : createTrailViewState({ kind: "home" }, options);
    case "project":
      return typeof record.projectId === "string" && record.projectId.trim() !== ""
        ? createTrailViewState({ kind: "project", projectId: record.projectId }, options)
        : createTrailViewState({ kind: "home" }, options);
    default:
      return createTrailViewState({ kind: "home" }, options);
  }
}
