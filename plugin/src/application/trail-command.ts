import type { TrailPriority } from "../domain/model/trail-values";
import {
  isTrailEstimate,
  isTrailPriority,
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

/** Keeps Markdown-significant inner whitespace while removing empty outer lines. */
export function normalizeTrailCommandDescription(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const lines = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  const normalized = lines.join("\n");
  return normalized === "" ? undefined : normalized;
}

export function normalizeTrailCommandPriority(
  value: TrailPriority | undefined,
): TrailPriority | undefined {
  if (value !== undefined && !isTrailPriority(value)) {
    throw new TrailCommandValidationError("Priority is invalid");
  }
  return value;
}

/** Label membership is a logical set, so command input is normalized and sorted once. */
export function normalizeTrailCommandIdSet(
  values: readonly string[],
  label: string,
): readonly string[] {
  const normalized = values.map((value) => normalizeTrailCommandId(value, label));
  if (new Set(normalized).size !== normalized.length) {
    throw new TrailCommandValidationError(`${label} must not contain duplicate IDs`);
  }
  return normalized.sort();
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
