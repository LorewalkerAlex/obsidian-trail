import type { TrailTriageIssue, TrailWorkflowIssue } from "../../domain/model/trail-entities";
import {
  isTrailEstimate,
  isTrailId,
  isTrailPlainObject,
  isTrailPriority,
  isTrailTimestamp,
  isTrailTitle,
  normalizeTrailTitle,
} from "../../domain/validation/trail-value-validation";
import {
  isRecordObject,
  requiredMarkdownOffset,
  type TrailMarkdownRecordSlice,
} from "../core/trail-markdown-core";
import { TRAIL_PHYSICAL_RECORD_SCHEMAS } from "../schema/trail-physical-schema";

export type TrailYamlParser = (yaml: string) => unknown;
export type TrailCodecIssueStage = "physical" | "field" | "domain";
export type TrailCodecEntityKind = "initiative" | "project" | "milestone" | "issue" | "cycle";

export interface TrailCodecIssue {
  readonly code: string;
  readonly entityId?: string;
  readonly entityKind?: TrailCodecEntityKind;
  readonly field?: string;
  readonly message: string;
  readonly offset?: number;
  readonly scope: "source" | "entity";
  readonly severity: "error";
  readonly sourcePath: string;
  readonly stage: TrailCodecIssueStage;
}

export function sourceCodecIssue(
  code: string,
  sourcePath: string,
  message: string,
  offset?: number,
  stage: TrailCodecIssueStage = "physical",
): TrailCodecIssue {
  return { code, message, offset, scope: "source", severity: "error", sourcePath, stage };
}

export function entityCodecIssue(
  code: string,
  sourcePath: string,
  entityKind: TrailCodecEntityKind,
  message: string,
  options: {
    readonly entityId?: string;
    readonly field?: string;
    readonly offset?: number;
    readonly stage?: TrailCodecIssueStage;
  } = {},
): TrailCodecIssue {
  return {
    code,
    entityId: options.entityId,
    entityKind,
    field: options.field,
    message,
    offset: options.offset,
    scope: "entity",
    severity: "error",
    sourcePath,
    stage: options.stage ?? "field",
  };
}

export function parseExactFrontmatter(
  yaml: string,
  parseYaml: TrailYamlParser,
  expected: Readonly<Record<string, unknown>>,
): readonly string[] {
  let value: unknown;
  try {
    value = parseYaml(yaml);
  } catch {
    value = undefined;
  }

  if (!isRecordObject(value)) return ["frontmatter is invalid YAML or not an object"];
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(value).sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    return [`frontmatter must contain exactly ${expectedKeys.join(" and ")}`];
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = value[key];
    if (expectedValue === "<id>") {
      if (!isTrailId(actualValue)) return [`frontmatter ${key} must be non-empty text`];
    } else if (actualValue !== expectedValue) {
      return [`frontmatter ${key} must be ${String(expectedValue)}`];
    }
  }
  return [];
}

export function parseJsonObject(raw: string, label: string): {
  readonly issues: readonly string[];
  readonly value?: Record<string, unknown>;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { issues: [`${label} must contain valid JSON`] };
  }
  if (!isTrailPlainObject(parsed)) return { issues: [`${label} JSON must be an object`] };
  return { issues: [], value: parsed };
}

export function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  issues: string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) issues.push(`unknown ${label} metadata field: ${key}`);
  }
}

export function parseRequiredId(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): string | undefined {
  const value = metadata[key];
  if (!isTrailId(value)) {
    issues.push(`${key} must be non-empty text`);
    return undefined;
  }
  return value;
}

export function parseOptionalId(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): string | undefined {
  const value = metadata[key];
  if (value === undefined) return undefined;
  if (!isTrailId(value)) {
    issues.push(`${key} must be non-empty text when present`);
    return undefined;
  }
  return value;
}

export function parseRequiredTimestamp(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): number | undefined {
  const value = metadata[key];
  if (!isTrailTimestamp(value)) {
    issues.push(`${key} must be a non-negative epoch-millisecond integer`);
    return undefined;
  }
  return value;
}

export function parseOptionalTimestamp(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): number | undefined {
  const value = metadata[key];
  if (value === undefined) return undefined;
  if (!isTrailTimestamp(value)) {
    issues.push(`${key} must be a non-negative epoch-millisecond integer when present`);
    return undefined;
  }
  return value;
}

export function parseOptionalPriority(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
) {
  const value = metadata[key];
  if (value === undefined) return undefined;
  if (!isTrailPriority(value)) {
    issues.push(`${key} must be urgent, high, medium, or low`);
    return undefined;
  }
  return value;
}

export function parseOptionalEstimate(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): number | undefined {
  const value = metadata[key];
  if (value === undefined) return undefined;
  if (!isTrailEstimate(value)) {
    issues.push(`${key} must be a non-negative integer when present`);
    return undefined;
  }
  return value;
}

export function parseIdSet(value: unknown, key: string, issues: string[]): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    issues.push(`${key} must be an array when present`);
    return [];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  value.forEach((entry, index) => {
    if (!isTrailId(entry)) {
      issues.push(`${key}[${index}] must be non-empty text`);
      return;
    }
    if (seen.has(entry)) {
      issues.push(`${key} contains duplicate ID: ${entry}`);
      return;
    }
    seen.add(entry);
    ids.push(entry);
  });
  return ids.sort();
}

export function canonicalIdSet(ids: readonly string[]): readonly string[] | undefined {
  return ids.length === 0 ? undefined : [...ids].sort();
}

export function canonicalMetadata(
  order: readonly string[],
  values: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of order) {
    const value = values[key];
    if (value !== undefined) result[key] = value;
  }
  return result;
}

export function serializeDataMarker(
  order: readonly string[],
  values: Readonly<Record<string, unknown>>,
): string {
  return `<!-- data ${JSON.stringify(canonicalMetadata(order, values))} -->`;
}

export function validateRecordEnvelope(
  record: TrailMarkdownRecordSlice,
  input: {
    readonly bodyStartOffset: number;
    readonly codePrefix: string;
    readonly entityKind: TrailCodecEntityKind;
    readonly label: string;
    readonly sourcePath: string;
  },
  issues: TrailCodecIssue[],
): boolean {
  const offset = input.bodyStartOffset + record.startOffset;
  const title = normalizeTrailTitle(record.title);
  if (!isTrailTitle(title)) {
    issues.push(entityCodecIssue(
      `${input.codePrefix}.title-invalid`,
      input.sourcePath,
      input.entityKind,
      `${input.label} title must be non-empty single-line text`,
      { offset, stage: "field" },
    ));
  }
  if (record.markerJson === null || record.immediateMarker === undefined) {
    issues.push(entityCodecIssue(
      `${input.codePrefix}.marker-position`,
      input.sourcePath,
      input.entityKind,
      `${input.label} metadata marker must immediately follow its H2`,
      { offset, stage: "physical" },
    ));
  }
  if (record.markerCount !== 1) {
    issues.push(entityCodecIssue(
      `${input.codePrefix}.marker-count`,
      input.sourcePath,
      input.entityKind,
      `${input.label} record requires exactly one metadata marker`,
      { offset, stage: "physical" },
    ));
  }
  return isTrailTitle(title)
    && record.markerJson !== null
    && record.immediateMarker !== undefined
    && record.markerCount === 1;
}

export function markerOffset(record: TrailMarkdownRecordSlice, bodyStartOffset: number): number | undefined {
  return record.immediateMarker === undefined
    ? undefined
    : bodyStartOffset + requiredMarkdownOffset(record.immediateMarker, "start");
}

export type TrailWorkflowIssuePhysicalContext =
  | { readonly kind: "project"; readonly projectId: string }
  | { readonly kind: "projectless" };

export function parseTriageIssueMetadata(raw: string): {
  readonly issue?: Omit<TrailTriageIssue, "description" | "title">;
  readonly issues: readonly string[];
} {
  const parsed = parseJsonObject(raw, "Issue data marker");
  if (parsed.value === undefined) return { issues: parsed.issues };
  const value = parsed.value;
  const issues: string[] = [];
  rejectUnknownKeys(
    value,
    TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder,
    "Issue",
    issues,
  );
  const id = parseRequiredId(value, "id", issues);
  if (value.context !== "triage") issues.push("context must be triage in Triage.md");
  for (const field of ["statusDefinitionId", "createdAt", "firstStartedAt", "terminalAt"] as const) {
    if (value[field] !== undefined) issues.push(`${field} is not valid on a Triage Issue`);
  }
  const projectId = parseOptionalId(value, "projectId", issues);
  const milestoneId = parseOptionalId(value, "milestoneId", issues);
  if (milestoneId !== undefined && projectId === undefined) issues.push("milestoneId requires projectId");
  const priority = parseOptionalPriority(value, "priority", issues);
  const estimate = parseOptionalEstimate(value, "estimate", issues);
  const due = parseRequiredTimestamp(value, "due", issues);
  const labelIds = parseIdSet(value.labelIds, "labelIds", issues);
  if (id === undefined || due === undefined || issues.length > 0) return { issues };
  return {
    issues,
    issue: {
      context: "triage",
      due,
      estimate,
      id,
      labelIds,
      milestoneId,
      priority,
      projectId,
    },
  };
}

export function parseWorkflowIssueMetadata(
  raw: string,
  context: TrailWorkflowIssuePhysicalContext,
): {
  readonly issue?: Omit<TrailWorkflowIssue, "description" | "title">;
  readonly issues: readonly string[];
} {
  const parsed = parseJsonObject(raw, "Issue data marker");
  if (parsed.value === undefined) return { issues: parsed.issues };
  const value = parsed.value;
  const issues: string[] = [];
  rejectUnknownKeys(
    value,
    TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder,
    "Issue",
    issues,
  );
  const id = parseRequiredId(value, "id", issues);
  if (value.context !== "workflow") issues.push("context must be workflow in a Workflow Issue container");
  const statusDefinitionId = parseRequiredId(value, "statusDefinitionId", issues);
  const createdAt = parseRequiredTimestamp(value, "createdAt", issues);
  const projectId = parseOptionalId(value, "projectId", issues);
  const milestoneId = parseOptionalId(value, "milestoneId", issues);
  if (context.kind === "project") {
    if (projectId === undefined) issues.push("projectId is required in a Project file");
    else if (projectId !== context.projectId) issues.push("projectId must match the owning Project file");
  } else {
    if (projectId !== undefined) issues.push("projectId must be absent in Projectless Issues.md");
    if (milestoneId !== undefined) issues.push("milestoneId must be absent in Projectless Issues.md");
  }
  if (milestoneId !== undefined && projectId === undefined) issues.push("milestoneId requires projectId");
  const priority = parseOptionalPriority(value, "priority", issues);
  const estimate = parseOptionalEstimate(value, "estimate", issues);
  const due = parseOptionalTimestamp(value, "due", issues);
  const labelIds = parseIdSet(value.labelIds, "labelIds", issues);
  const firstStartedAt = parseOptionalTimestamp(value, "firstStartedAt", issues);
  const terminalAt = parseOptionalTimestamp(value, "terminalAt", issues);
  if (id === undefined || statusDefinitionId === undefined || createdAt === undefined || issues.length > 0) {
    return { issues };
  }
  return {
    issues,
    issue: {
      context: "workflow",
      createdAt,
      due,
      estimate,
      firstStartedAt,
      id,
      labelIds,
      milestoneId,
      priority,
      projectId,
      statusDefinitionId,
      terminalAt,
    },
  };
}

export function canonicalTriageIssueMetadata(issue: TrailTriageIssue): Record<string, unknown> {
  return canonicalMetadata(
    TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder,
    {
      id: issue.id,
      context: "triage",
      projectId: issue.projectId,
      milestoneId: issue.milestoneId,
      priority: issue.priority,
      estimate: issue.estimate,
      due: issue.due,
      labelIds: canonicalIdSet(issue.labelIds),
    },
  );
}

export function canonicalWorkflowIssueMetadata(issue: TrailWorkflowIssue): Record<string, unknown> {
  return canonicalMetadata(
    TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder,
    {
      id: issue.id,
      context: "workflow",
      statusDefinitionId: issue.statusDefinitionId,
      projectId: issue.projectId,
      milestoneId: issue.milestoneId,
      priority: issue.priority,
      estimate: issue.estimate,
      due: issue.due,
      labelIds: canonicalIdSet(issue.labelIds),
      createdAt: issue.createdAt,
      firstStartedAt: issue.firstStartedAt,
      terminalAt: issue.terminalAt,
    },
  );
}
