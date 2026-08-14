import {
  isTrailEpochMilliseconds,
  isTrailEstimateCarrier,
  isTrailPriority,
  type TrailTriageIssue,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailSourceIssue } from "../../domain/trail-source-issue";
import { isRecordObject } from "../core/trail-markdown-core";
import { TRAIL_PHYSICAL_RECORD_SCHEMAS } from "../schema/trail-physical-schema";

export type TrailYamlParser = (yaml: string) => unknown;
export type TrailCodecIssue = TrailSourceIssue;

export function fileCodecIssue(
  code: string,
  filePath: string,
  message: string,
  offset?: number,
): TrailCodecIssue {
  return { code, filePath, message, offset, scope: "file" };
}

export function recordCodecIssue(
  code: string,
  filePath: string,
  message: string,
  objectId?: string,
  offset?: number,
): TrailCodecIssue {
  return { code, filePath, message, objectId, offset, scope: "record" };
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

  if (!isRecordObject(value)) {
    return ["frontmatter is invalid YAML or not an object"];
  }
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(value).sort();
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return [`frontmatter must contain exactly ${expectedKeys.join(" and ")}`];
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = value[key];
    if (expectedValue === "<non-empty-string>") {
      if (typeof actualValue !== "string" || actualValue.trim() === "") {
        return [`frontmatter ${key} must be non-empty text`];
      }
    } else if (actualValue !== expectedValue) {
      return [`frontmatter ${key} must be ${String(expectedValue)}`];
    }
  }
  return [];
}

function parseJsonObject(raw: string, label: string): {
  readonly issues: string[];
  readonly value?: Record<string, unknown>;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { issues: [`${label} must contain valid JSON`] };
  }
  if (!isRecordObject(parsed)) {
    return { issues: [`${label} JSON must be an object`] };
  }
  return { issues: [], value: parsed };
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  issues: string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      issues.push(`unknown ${label} metadata field: ${key}`);
    }
  }
}

export function parseOptionalString(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): string | undefined {
  const value = metadata[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${key} must be non-empty text when present`);
    return undefined;
  }
  return value;
}

export function parseRequiredString(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): string | undefined {
  const value = metadata[key];
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${key} must be non-empty text`);
    return undefined;
  }
  return value;
}

export function parseOptionalEpoch(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): number | undefined {
  const value = metadata[key];
  if (value === undefined) {
    return undefined;
  }
  if (!isTrailEpochMilliseconds(value)) {
    issues.push(`${key} must be a non-negative epoch-millisecond integer when present`);
    return undefined;
  }
  return value;
}

export function parseRequiredEpoch(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): number | undefined {
  const value = metadata[key];
  if (!isTrailEpochMilliseconds(value)) {
    issues.push(`${key} must be a non-negative epoch-millisecond integer`);
    return undefined;
  }
  return value;
}

export function parseIdSet(
  value: unknown,
  key: string,
  issues: string[],
): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push(`${key} must be an array when present`);
    return [];
  }

  const seen = new Set<string>();
  const ids: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim() === "") {
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

export function parseTriageIssueMetadata(raw: string): {
  readonly issue?: Omit<TrailTriageIssue, "description" | "title">;
  readonly issues: string[];
} {
  const parsed = parseJsonObject(raw, "data marker");
  if (parsed.value === undefined) {
    return { issues: parsed.issues };
  }
  const value = parsed.value;
  const issues = [...parsed.issues];
  rejectUnknownKeys(
    value,
    TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder,
    "Issue",
    issues,
  );

  const id = parseRequiredString(value, "id", issues);
  if (value.context !== "triage") {
    issues.push("context must be triage in Triage.md");
  }
  const due = parseRequiredEpoch(value, "due", issues);

  for (const workflowOnly of [
    "statusDefinitionId",
    "createdAt",
    "firstStartedAt",
    "terminalAt",
  ] as const) {
    if (value[workflowOnly] !== undefined) {
      issues.push(`${workflowOnly} is not valid on a Triage Issue`);
    }
  }

  const projectId = parseOptionalString(value, "projectId", issues);
  const milestoneId = parseOptionalString(value, "milestoneId", issues);
  if (milestoneId !== undefined && projectId === undefined) {
    issues.push("milestoneId requires projectId");
  }

  let priority: TrailTriageIssue["priority"];
  if (value.priority !== undefined) {
    if (!isTrailPriority(value.priority)) {
      issues.push("priority must be urgent, high, medium, or low");
    } else {
      priority = value.priority;
    }
  }

  let estimate: number | undefined;
  if (value.estimate !== undefined) {
    if (!isTrailEstimateCarrier(value.estimate)) {
      issues.push("estimate must be a non-negative integer when present");
    } else {
      estimate = value.estimate;
    }
  }
  const labelIds = parseIdSet(value.labelIds, "labelIds", issues);

  if (id === undefined || due === undefined || issues.length > 0) {
    return { issues };
  }

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

export type WorkflowIssuePhysicalContext =
  | { readonly kind: "project"; readonly projectId: string }
  | { readonly kind: "projectless" };

export function parseWorkflowIssueMetadata(
  raw: string,
  context: WorkflowIssuePhysicalContext,
): {
  readonly issue?: Omit<TrailWorkflowIssue, "description" | "title">;
  readonly issues: string[];
} {
  const parsed = parseJsonObject(raw, "Issue data marker");
  if (parsed.value === undefined) {
    return { issues: parsed.issues };
  }
  const value = parsed.value;
  const issues = [...parsed.issues];
  rejectUnknownKeys(
    value,
    TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder,
    "Issue",
    issues,
  );

  const id = parseRequiredString(value, "id", issues);
  if (value.context !== "workflow") {
    issues.push("context must be workflow in a Workflow Issue container");
  }
  const statusDefinitionId = parseRequiredString(
    value,
    "statusDefinitionId",
    issues,
  );
  const createdAt = parseRequiredEpoch(value, "createdAt", issues);
  const projectId = parseOptionalString(value, "projectId", issues);
  const milestoneId = parseOptionalString(value, "milestoneId", issues);

  if (context.kind === "project") {
    if (projectId === undefined) {
      issues.push("projectId must be non-empty text");
    } else if (projectId !== context.projectId) {
      issues.push("projectId must match the owning Project file");
    }
  } else {
    if (projectId !== undefined) {
      issues.push("projectId must be absent in Projectless Issues.md");
    }
    if (milestoneId !== undefined) {
      issues.push("milestoneId must be absent in Projectless Issues.md");
    }
  }

  let priority: TrailWorkflowIssue["priority"];
  if (value.priority !== undefined) {
    if (!isTrailPriority(value.priority)) {
      issues.push("priority must be urgent, high, medium, or low");
    } else {
      priority = value.priority;
    }
  }

  let estimate: number | undefined;
  if (value.estimate !== undefined) {
    if (!isTrailEstimateCarrier(value.estimate)) {
      issues.push("estimate must be a non-negative integer when present");
    } else {
      estimate = value.estimate;
    }
  }

  const due = parseOptionalEpoch(value, "due", issues);
  const labelIds = parseIdSet(value.labelIds, "labelIds", issues);
  const firstStartedAt = parseOptionalEpoch(value, "firstStartedAt", issues);
  const terminalAt = parseOptionalEpoch(value, "terminalAt", issues);

  if (
    id === undefined
    || statusDefinitionId === undefined
    || createdAt === undefined
    || issues.length > 0
  ) {
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

export function canonicalTriageIssueMetadata(
  issue: TrailTriageIssue,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    id: issue.id,
    context: "triage",
  };
  if (issue.projectId !== undefined) metadata.projectId = issue.projectId;
  if (issue.milestoneId !== undefined) metadata.milestoneId = issue.milestoneId;
  if (issue.priority !== undefined) metadata.priority = issue.priority;
  if (issue.estimate !== undefined) metadata.estimate = issue.estimate;
  metadata.due = issue.due;
  if (issue.labelIds.length > 0) metadata.labelIds = [...issue.labelIds].sort();
  return metadata;
}

export function canonicalWorkflowIssueMetadata(
  issue: TrailWorkflowIssue,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    id: issue.id,
    context: "workflow",
    statusDefinitionId: issue.statusDefinitionId,
  };
  if (issue.projectId !== undefined) metadata.projectId = issue.projectId;
  if (issue.milestoneId !== undefined) metadata.milestoneId = issue.milestoneId;
  if (issue.priority !== undefined) metadata.priority = issue.priority;
  if (issue.estimate !== undefined) metadata.estimate = issue.estimate;
  if (issue.due !== undefined) metadata.due = issue.due;
  if (issue.labelIds.length > 0) metadata.labelIds = [...issue.labelIds].sort();
  metadata.createdAt = issue.createdAt;
  if (issue.firstStartedAt !== undefined) metadata.firstStartedAt = issue.firstStartedAt;
  if (issue.terminalAt !== undefined) metadata.terminalAt = issue.terminalAt;
  return metadata;
}
