import {
  isTrailEpochMilliseconds,
  isTrailPriority,
  isValidTrailTitle,
  normalizeTrailTitle,
  type TrailPriority,
  type TrailRecordSourceRange,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailSourceIssue } from "../../domain/trail-source-issue";
import {
  collectMarkdownH2Records,
  isMarkdownHeading,
  isRecordObject,
  markdownHeadingText,
  normalizeMarkdownRecordBody,
  parseMarkdownBody,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
} from "../core/trail-markdown-core";
import { TRAIL_PHYSICAL_RECORD_SCHEMAS } from "../schema/trail-physical-schema";
import {
  fileCodecIssue,
  parseExactFrontmatter,
  parseIdSet,
  parseOptionalEpoch,
  parseRequiredEpoch,
  parseRequiredString,
  parseWorkflowIssueMetadata,
  recordCodecIssue,
  type TrailYamlParser,
} from "./trail-codec-support";

export interface TrailPhysicalInitiativeRecord {
  readonly description?: string;
  readonly due?: number;
  readonly id: string;
  readonly labelIds: readonly string[];
  readonly priority?: TrailPriority;
  readonly title: string;
}

export interface TrailPhysicalCycleRecord {
  readonly endedAt?: number;
  readonly id: string;
  readonly issueIds: readonly string[];
  readonly label: string;
  readonly plannedEnd: number;
  readonly startedAt: number;
}

export interface TrailInitiativeParseResult {
  readonly initiative?: TrailPhysicalInitiativeRecord;
  readonly issues: readonly TrailSourceIssue[];
}

export interface TrailProjectlessIssuesParseResult {
  readonly issues: readonly TrailSourceIssue[];
  readonly issuesById: Readonly<Record<string, TrailWorkflowIssue>>;
  readonly sourceByIssueId: Readonly<Record<string, TrailRecordSourceRange>>;
}

export interface TrailCyclesParseResult {
  readonly cyclesById: Readonly<Record<string, TrailPhysicalCycleRecord>>;
  readonly issues: readonly TrailSourceIssue[];
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

function rejectUnknownMetadata(
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

function parseFileIdentity(
  yaml: string,
  parseYaml: TrailYamlParser,
  kind: "initiative",
): { readonly id?: string; readonly issues: readonly string[] } {
  let value: unknown;
  try {
    value = parseYaml(yaml);
  } catch {
    value = undefined;
  }
  if (
    !isRecordObject(value)
    || Object.keys(value).length !== 2
    || Object.keys(value).some((key) => key !== "kind" && key !== "id")
    || value.kind !== kind
    || typeof value.id !== "string"
    || value.id.trim() === ""
  ) {
    return {
      issues: [`frontmatter must contain exactly kind: ${kind} and a non-empty id`],
    };
  }
  return { id: value.id, issues: [] };
}

export function parseInitiativeMarkdown(input: {
  readonly filePath: string;
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
}): TrailInitiativeParseResult {
  const issues: TrailSourceIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return {
      issues: [fileCodecIssue(
        "initiative.frontmatter.missing",
        input.filePath,
        "Initiative file requires a frontmatter block",
      )],
    };
  }
  const identity = parseFileIdentity(frontmatter.yaml, input.parseYaml, "initiative");
  if (identity.id === undefined) {
    return {
      issues: [fileCodecIssue(
        "initiative.frontmatter.invalid",
        input.filePath,
        identity.issues[0],
      )],
    };
  }

  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  const h1 = children.filter((node) => isMarkdownHeading(node, 1));
  if (
    h1.length !== 1
    || markdownHeadingText(h1[0]) !== "Initiative"
    || children[0] !== h1[0]
  ) {
    return {
      issues: [fileCodecIssue(
        "initiative.structure",
        input.filePath,
        "Initiative file requires exactly one root # Initiative section",
      )],
    };
  }

  const region = collectMarkdownH2Records(body, children, 1);
  if (region.records.length !== 1 || region.orphanNodes.length > 0) {
    return {
      issues: [fileCodecIssue(
        "initiative.record.count",
        input.filePath,
        "# Initiative must contain exactly one H2 Initiative record",
      )],
    };
  }
  const record = region.records[0];
  const title = normalizeTrailTitle(record.title);
  if (!isValidTrailTitle(title)) {
    issues.push(recordCodecIssue(
      "initiative.record.title-invalid",
      input.filePath,
      "Initiative title must be non-empty single-line text",
      identity.id,
    ));
  }
  if (record.markerJson === null || record.immediateMarker === undefined) {
    issues.push(recordCodecIssue(
      "initiative.record.marker-position",
      input.filePath,
      "Initiative metadata marker must immediately follow the H2",
      identity.id,
    ));
  }
  if (record.markerCount !== 1) {
    issues.push(recordCodecIssue(
      "initiative.record.marker-count",
      input.filePath,
      "Initiative record requires exactly one metadata marker",
      identity.id,
    ));
  }
  if (issues.length > 0 || record.markerJson === null || record.immediateMarker === undefined) {
    return { issues };
  }

  const parsed = parseJsonObject(record.markerJson, "Initiative data marker");
  if (parsed.value === undefined) {
    return {
      issues: parsed.issues.map((message) => recordCodecIssue(
        "initiative.record.metadata-invalid",
        input.filePath,
        message,
        identity.id,
      )),
    };
  }
  const metadataIssues = [...parsed.issues];
  rejectUnknownMetadata(
    parsed.value,
    TRAIL_PHYSICAL_RECORD_SCHEMAS.initiative.metadataOrder,
    "Initiative",
    metadataIssues,
  );
  let priority: TrailPriority | undefined;
  if (parsed.value.priority !== undefined) {
    if (!isTrailPriority(parsed.value.priority)) {
      metadataIssues.push("priority must be urgent, high, medium, or low");
    } else {
      priority = parsed.value.priority;
    }
  }
  const due = parseOptionalEpoch(parsed.value, "due", metadataIssues);
  const labelIds = parseIdSet(parsed.value.labelIds, "labelIds", metadataIssues);
  if (metadataIssues.length > 0) {
    return {
      issues: metadataIssues.map((message) => recordCodecIssue(
        "initiative.record.metadata-invalid",
        input.filePath,
        message,
        identity.id,
      )),
    };
  }
  const markerEnd = requiredMarkdownOffset(record.immediateMarker, "end");
  return {
    initiative: {
      description: normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)),
      due,
      id: identity.id,
      labelIds,
      priority,
      title,
    },
    issues,
  };
}

function parseIssueContainer(input: {
  readonly filePath: string;
  readonly frontmatterKind: "projectless-issues";
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
}): TrailProjectlessIssuesParseResult {
  const issues: TrailSourceIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return {
      issues: [fileCodecIssue(
        "projectless.frontmatter.missing",
        input.filePath,
        "Projectless Issues container requires frontmatter",
      )],
      issuesById: {},
      sourceByIssueId: {},
    };
  }
  if (parseExactFrontmatter(
    frontmatter.yaml,
    input.parseYaml,
    { kind: input.frontmatterKind },
  ).length > 0) {
    issues.push(fileCodecIssue(
      "projectless.frontmatter.invalid",
      input.filePath,
      "Projectless Issues frontmatter must contain exactly kind: projectless-issues",
    ));
  }

  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  if (
    children.length === 0
    || !isMarkdownHeading(children[0], 1)
    || markdownHeadingText(children[0]) !== "Issues"
    || children.filter((node) => isMarkdownHeading(node, 1)).length !== 1
  ) {
    issues.push(fileCodecIssue(
      "projectless.structure.issues-heading",
      input.filePath,
      "Projectless Issues requires exactly one root # Issues heading",
    ));
    return { issues, issuesById: {}, sourceByIssueId: {} };
  }

  const region = collectMarkdownH2Records(body, children, 1);
  region.orphanNodes.forEach((node) => {
    issues.push(fileCodecIssue(
      "projectless.structure.orphan-content",
      input.filePath,
      "Root content must belong to an H2 Workflow Issue record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(node, "start"),
    ));
  });

  const candidates: Array<{
    readonly issue: TrailWorkflowIssue;
    readonly source: TrailRecordSourceRange;
  }> = [];
  for (const record of region.records) {
    const title = normalizeTrailTitle(record.title);
    if (!isValidTrailTitle(title)) {
      issues.push(recordCodecIssue(
        "projectless.issue.title-invalid",
        input.filePath,
        "Workflow Issue title must be non-empty single-line text",
      ));
    }
    if (record.markerJson === null || record.immediateMarker === undefined) {
      issues.push(recordCodecIssue(
        "projectless.issue.marker-position",
        input.filePath,
        "Workflow Issue metadata marker must immediately follow its H2",
      ));
    }
    if (record.markerCount !== 1) {
      issues.push(recordCodecIssue(
        "projectless.issue.marker-count",
        input.filePath,
        "Workflow Issue record requires exactly one metadata marker",
      ));
    }
    if (
      !isValidTrailTitle(title)
      || record.markerJson === null
      || record.immediateMarker === undefined
      || record.markerCount !== 1
    ) {
      continue;
    }
    const metadata = parseWorkflowIssueMetadata(record.markerJson, { kind: "projectless" });
    const objectId = metadata.issue?.id;
    const markerStart = requiredMarkdownOffset(record.immediateMarker, "start");
    metadata.issues.forEach((message) => {
      issues.push(recordCodecIssue(
        "projectless.issue.metadata-invalid",
        input.filePath,
        message,
        objectId,
        frontmatter.bodyStartOffset + markerStart,
      ));
    });
    if (metadata.issue === undefined || metadata.issues.length > 0) {
      continue;
    }
    const markerEnd = requiredMarkdownOffset(record.immediateMarker, "end");
    candidates.push({
      issue: {
        ...metadata.issue,
        description: normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)),
        title,
      },
      source: {
        endOffset: frontmatter.bodyStartOffset + record.endOffset,
        filePath: input.filePath,
        markerEndOffset: frontmatter.bodyStartOffset + markerEnd,
        markerStartOffset: frontmatter.bodyStartOffset + markerStart,
        startOffset: frontmatter.bodyStartOffset + record.startOffset,
      },
    });
  }

  const counts = new Map<string, number>();
  candidates.forEach(({ issue }) => counts.set(issue.id, (counts.get(issue.id) ?? 0) + 1));
  const duplicateIds = new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );
  duplicateIds.forEach((id) => {
    issues.push(recordCodecIssue(
      "projectless.issue.id-duplicate",
      input.filePath,
      `Duplicate Workflow Issue ID: ${id}`,
      id,
    ));
  });
  const accepted = candidates.filter(({ issue }) => !duplicateIds.has(issue.id));
  return {
    issues,
    issuesById: Object.fromEntries(accepted.map(({ issue }) => [issue.id, issue])),
    sourceByIssueId: Object.fromEntries(accepted.map(({ issue, source }) => [issue.id, source])),
  };
}

export function parseProjectlessIssuesMarkdown(input: {
  readonly filePath: string;
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
}): TrailProjectlessIssuesParseResult {
  return parseIssueContainer({ ...input, frontmatterKind: "projectless-issues" });
}

function parseCycleMetadata(raw: string): {
  readonly cycle?: Omit<TrailPhysicalCycleRecord, "label">;
  readonly issues: string[];
} {
  const parsed = parseJsonObject(raw, "Cycle data marker");
  if (parsed.value === undefined) {
    return { issues: parsed.issues };
  }
  const issues = [...parsed.issues];
  rejectUnknownMetadata(
    parsed.value,
    TRAIL_PHYSICAL_RECORD_SCHEMAS.cycle.metadataOrder,
    "Cycle",
    issues,
  );
  const id = parseRequiredString(parsed.value, "id", issues);
  const startedAt = parseRequiredEpoch(parsed.value, "startedAt", issues);
  const plannedEnd = parseRequiredEpoch(parsed.value, "plannedEnd", issues);
  const endedAt = parseOptionalEpoch(parsed.value, "endedAt", issues);
  const issueIds = parseIdSet(parsed.value.issueIds, "issueIds", issues);
  if (
    id === undefined
    || startedAt === undefined
    || plannedEnd === undefined
    || issues.length > 0
  ) {
    return { issues };
  }
  return {
    cycle: { endedAt, id, issueIds, plannedEnd, startedAt },
    issues,
  };
}

export function parseCyclesMarkdown(input: {
  readonly filePath: string;
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
}): TrailCyclesParseResult {
  const issues: TrailSourceIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return {
      cyclesById: {},
      issues: [fileCodecIssue(
        "cycles.frontmatter.missing",
        input.filePath,
        "Cycles container requires frontmatter",
      )],
    };
  }
  if (parseExactFrontmatter(frontmatter.yaml, input.parseYaml, { kind: "cycles" }).length > 0) {
    issues.push(fileCodecIssue(
      "cycles.frontmatter.invalid",
      input.filePath,
      "Cycles frontmatter must contain exactly kind: cycles",
    ));
  }
  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  if (
    children.length === 0
    || !isMarkdownHeading(children[0], 1)
    || markdownHeadingText(children[0]) !== "Cycles"
    || children.filter((node) => isMarkdownHeading(node, 1)).length !== 1
  ) {
    issues.push(fileCodecIssue(
      "cycles.structure.heading",
      input.filePath,
      "Cycles container requires exactly one root # Cycles heading",
    ));
    return { cyclesById: {}, issues };
  }

  const region = collectMarkdownH2Records(body, children, 1);
  region.orphanNodes.forEach((node) => {
    issues.push(fileCodecIssue(
      "cycles.structure.orphan-content",
      input.filePath,
      "Root content must belong to an H2 Cycle record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(node, "start"),
    ));
  });

  const candidates: TrailPhysicalCycleRecord[] = [];
  for (const record of region.records) {
    const label = normalizeTrailTitle(record.title);
    if (!isValidTrailTitle(label)) {
      issues.push(recordCodecIssue(
        "cycles.record.label-invalid",
        input.filePath,
        "Cycle derived H2 label must be non-empty single-line text",
      ));
    }
    if (record.markerJson === null || record.immediateMarker === undefined) {
      issues.push(recordCodecIssue(
        "cycles.record.marker-position",
        input.filePath,
        "Cycle metadata marker must immediately follow its H2",
      ));
    }
    if (record.markerCount !== 1) {
      issues.push(recordCodecIssue(
        "cycles.record.marker-count",
        input.filePath,
        "Cycle record requires exactly one metadata marker",
      ));
    }
    if (
      !isValidTrailTitle(label)
      || record.markerJson === null
      || record.immediateMarker === undefined
      || record.markerCount !== 1
    ) {
      continue;
    }
    const metadata = parseCycleMetadata(record.markerJson);
    const objectId = metadata.cycle?.id;
    const markerStart = requiredMarkdownOffset(record.immediateMarker, "start");
    const markerEnd = requiredMarkdownOffset(record.immediateMarker, "end");
    const recordBody = normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset));
    if (recordBody !== undefined) {
      metadata.issues.push("Cycle record must not contain a description body");
    }
    metadata.issues.forEach((message) => {
      issues.push(recordCodecIssue(
        "cycles.record.metadata-invalid",
        input.filePath,
        message,
        objectId,
        frontmatter.bodyStartOffset + markerStart,
      ));
    });
    if (metadata.cycle !== undefined && metadata.issues.length === 0) {
      candidates.push({ ...metadata.cycle, label });
    }
  }

  const counts = new Map<string, number>();
  candidates.forEach((cycle) => counts.set(cycle.id, (counts.get(cycle.id) ?? 0) + 1));
  const duplicateIds = new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );
  duplicateIds.forEach((id) => {
    issues.push(recordCodecIssue(
      "cycles.record.id-duplicate",
      input.filePath,
      `Duplicate Cycle ID: ${id}`,
      id,
    ));
  });

  return {
    cyclesById: Object.fromEntries(
      candidates.filter((cycle) => !duplicateIds.has(cycle.id)).map((cycle) => [cycle.id, cycle]),
    ),
    issues,
  };
}

function canonicalInitiativeMetadata(
  initiative: TrailPhysicalInitiativeRecord,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  if (initiative.priority !== undefined) metadata.priority = initiative.priority;
  if (initiative.due !== undefined) metadata.due = initiative.due;
  if (initiative.labelIds.length > 0) metadata.labelIds = [...initiative.labelIds].sort();
  return metadata;
}

export function serializeInitiativeMarkdown(
  initiative: TrailPhysicalInitiativeRecord,
): string {
  if (initiative.id.trim() === "" || !isValidTrailTitle(initiative.title)) {
    throw new Error("Cannot serialize an invalid Initiative record");
  }
  if (initiative.priority !== undefined && !isTrailPriority(initiative.priority)) {
    throw new Error("Cannot serialize an invalid Initiative priority");
  }
  if (initiative.due !== undefined && !isTrailEpochMilliseconds(initiative.due)) {
    throw new Error("Cannot serialize an invalid Initiative due timestamp");
  }
  const lines = [
    "---",
    "kind: initiative",
    `id: ${JSON.stringify(initiative.id)}`,
    "---",
    "",
    "# Initiative",
    "",
    `## ${normalizeTrailTitle(initiative.title)}`,
    `<!-- data ${JSON.stringify(canonicalInitiativeMetadata(initiative))} -->`,
  ];
  const description = initiative.description === undefined
    ? undefined
    : normalizeMarkdownRecordBody(initiative.description);
  if (description !== undefined) lines.push("", description);
  lines.push("");
  return lines.join("\n");
}

function canonicalProjectlessIssueMetadata(
  issue: TrailWorkflowIssue,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    id: issue.id,
    context: "workflow",
    statusDefinitionId: issue.statusDefinitionId,
  };
  if (issue.priority !== undefined) metadata.priority = issue.priority;
  if (issue.estimate !== undefined) metadata.estimate = issue.estimate;
  if (issue.due !== undefined) metadata.due = issue.due;
  if (issue.labelIds.length > 0) metadata.labelIds = [...issue.labelIds].sort();
  metadata.createdAt = issue.createdAt;
  if (issue.firstStartedAt !== undefined) metadata.firstStartedAt = issue.firstStartedAt;
  if (issue.terminalAt !== undefined) metadata.terminalAt = issue.terminalAt;
  return metadata;
}

export function serializeProjectlessWorkflowIssue(
  issue: TrailWorkflowIssue,
): string {
  if (
    issue.context !== "workflow"
    || issue.id.trim() === ""
    || issue.statusDefinitionId.trim() === ""
    || !isValidTrailTitle(issue.title)
    || !isTrailEpochMilliseconds(issue.createdAt)
    || issue.projectId !== undefined
    || issue.milestoneId !== undefined
  ) {
    throw new Error("Cannot serialize an invalid Projectless Workflow Issue");
  }
  const lines = [
    `## ${normalizeTrailTitle(issue.title)}`,
    `<!-- data ${JSON.stringify(canonicalProjectlessIssueMetadata(issue))} -->`,
  ];
  const description = issue.description === undefined
    ? undefined
    : normalizeMarkdownRecordBody(issue.description);
  if (description !== undefined) lines.push("", description);
  return lines.join("\n");
}

export function serializeProjectlessIssuesMarkdown(
  issues: readonly TrailWorkflowIssue[],
): string {
  const blocks = issues.map(serializeProjectlessWorkflowIssue);
  return [
    "---",
    "kind: projectless-issues",
    "---",
    "",
    "# Issues",
    ...blocks.flatMap((block) => ["", block]),
    "",
  ].join("\n");
}

function canonicalCycleMetadata(
  cycle: TrailPhysicalCycleRecord,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    id: cycle.id,
    startedAt: cycle.startedAt,
    plannedEnd: cycle.plannedEnd,
  };
  if (cycle.endedAt !== undefined) metadata.endedAt = cycle.endedAt;
  if (cycle.issueIds.length > 0) metadata.issueIds = [...cycle.issueIds].sort();
  return metadata;
}

export function serializeCycleRecord(cycle: TrailPhysicalCycleRecord): string {
  if (
    cycle.id.trim() === ""
    || !isValidTrailTitle(cycle.label)
    || !isTrailEpochMilliseconds(cycle.startedAt)
    || !isTrailEpochMilliseconds(cycle.plannedEnd)
    || (cycle.endedAt !== undefined && !isTrailEpochMilliseconds(cycle.endedAt))
  ) {
    throw new Error("Cannot serialize an invalid Cycle record");
  }
  return [
    `## ${normalizeTrailTitle(cycle.label)}`,
    `<!-- data ${JSON.stringify(canonicalCycleMetadata(cycle))} -->`,
  ].join("\n");
}

export function serializeCyclesMarkdown(
  cycles: readonly TrailPhysicalCycleRecord[],
): string {
  const blocks = cycles.map(serializeCycleRecord);
  return [
    "---",
    "kind: cycles",
    "---",
    "",
    "# Cycles",
    ...blocks.flatMap((block) => ["", block]),
    "",
  ].join("\n");
}
