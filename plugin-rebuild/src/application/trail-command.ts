import {
  isTrailEstimate,
  isTrailTimestamp,
  isTrailTitle,
  normalizeTrailTitle,
} from "../domain/validation/trail-value-validation";

export interface TrailCommandEnvironment {
  readonly createId: () => string;
  readonly now: () => number;
}

export class TrailCommandValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TrailCommandValidationError";
  }
}

export function normalizeTrailCommandId(id: string, label: string): string {
  const normalized = id.trim();
  if (normalized === "") throw new TrailCommandValidationError(`${label} must be non-empty text`);
  return normalized;
}

export function normalizeTrailCommandTime(environment: TrailCommandEnvironment): number {
  const effectiveAt = environment.now();
  if (!isTrailTimestamp(effectiveAt)) {
    throw new TrailCommandValidationError("Command effective timestamp is invalid");
  }
  return effectiveAt;
}

export function normalizeTrailCommandTitle(title: string, label: string): string {
  const normalized = normalizeTrailTitle(title);
  if (!isTrailTitle(normalized)) {
    throw new TrailCommandValidationError(`${label} title must be non-empty single-line text`);
  }
  return normalized;
}

export function normalizeTrailCommandTimestamp(value: number, label: string): number {
  if (!isTrailTimestamp(value)) {
    throw new TrailCommandValidationError(`${label} must be an epoch-millisecond timestamp`);
  }
  return value;
}

export function normalizeTrailCommandEstimate(
  value: number | undefined,
): number | undefined {
  if (value !== undefined && !isTrailEstimate(value)) {
    throw new TrailCommandValidationError("Estimate must be a non-negative integer");
  }
  return value;
}
