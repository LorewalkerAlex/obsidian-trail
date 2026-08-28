import {
  TRAIL_ESTIMATES,
  TRAIL_LABEL_ENTITY_TYPES,
  TRAIL_LABEL_SELECTION_MODES,
  TRAIL_PRIORITIES,
  TRAIL_STATUS_CATEGORIES,
  TRAIL_STATUS_ENTITY_TYPES,
  type TrailEstimate,
  type TrailLabelEntityType,
  type TrailLabelSelectionMode,
  type TrailPriority,
  type TrailStatusCategory,
  type TrailStatusEntityType,
  type TrailTimestamp,
} from "../model/trail-values";

export function isTrailId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isTrailTimestamp(value: unknown): value is TrailTimestamp {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function isTrailEstimate(value: unknown): value is TrailEstimate {
  return typeof value === "string" && (TRAIL_ESTIMATES as readonly string[]).includes(value);
}

export function isTrailEstimateWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isTrailPriority(value: unknown): value is TrailPriority {
  return typeof value === "string" && (TRAIL_PRIORITIES as readonly string[]).includes(value);
}

export function isTrailStatusCategory(value: unknown): value is TrailStatusCategory {
  return typeof value === "string" && (TRAIL_STATUS_CATEGORIES as readonly string[]).includes(value);
}

export function isTrailStatusEntityType(value: unknown): value is TrailStatusEntityType {
  return typeof value === "string" && (TRAIL_STATUS_ENTITY_TYPES as readonly string[]).includes(value);
}

export function isTrailLabelEntityType(value: unknown): value is TrailLabelEntityType {
  return typeof value === "string" && (TRAIL_LABEL_ENTITY_TYPES as readonly string[]).includes(value);
}

export function isTrailLabelSelectionMode(value: unknown): value is TrailLabelSelectionMode {
  return typeof value === "string" && (TRAIL_LABEL_SELECTION_MODES as readonly string[]).includes(value);
}

export function normalizeTrailTitle(value: string): string {
  return value.trim();
}

export function isTrailTitle(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = normalizeTrailTitle(value);
  return normalized.length > 0 && !normalized.includes("\n") && !normalized.includes("\r");
}

export function isTrailPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
