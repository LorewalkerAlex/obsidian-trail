import {
  isTrailEpochMilliseconds,
  isValidTrailTitle,
  normalizeTrailTitle,
} from "../domain/trail-issue";

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

/** Freezes a non-empty stable identifier at command creation time. */
export function normalizeTrailCommandId(id: string, label: string): string {
  const normalized = id.trim();
  if (normalized === "") {
    throw new TrailCommandValidationError(`${label} must be non-empty text`);
  }
  return normalized;
}

/** Freezes the command timestamp before planning so retries cannot change semantics. */
export function normalizeTrailCommandTime(environment: TrailCommandEnvironment): number {
  const effectiveAt = environment.now();
  if (!isTrailEpochMilliseconds(effectiveAt)) {
    throw new TrailCommandValidationError("Command effective timestamp is invalid");
  }
  return effectiveAt;
}

export function normalizeTrailCommandTitle(title: string, label: string): string {
  const normalized = normalizeTrailTitle(title);
  if (!isValidTrailTitle(normalized)) {
    throw new TrailCommandValidationError(`${label} title must be non-empty single-line text`);
  }
  return normalized;
}
