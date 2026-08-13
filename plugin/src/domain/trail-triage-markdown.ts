import { fromMarkdown } from "mdast-util-from-markdown";

import {
  isTrailEpochMilliseconds,
  isTrailPriority,
  isValidTrailTitle,
  normalizeTrailTitle,
  sameTrailTriageIssue,
  type TrailRecordSourceRange,
  type TrailTriageIssue,
} from "./trail-issue";

export type TrailYamlParser = (yaml: string) => unknown;

type RootChild = ReturnType<typeof fromMarkdown>["children"][number];
type HeadingNode = Extract<RootChild, { type: "heading" }>;
type HtmlNode = Extract<RootChild, { type: "html" }>;

export interface TrailTriageParseIssue {
  readonly code: string;
  readonly filePath: string;
  readonly message: string;
  readonly objectId?: string;
  readonly offset?: number;
  readonly scope: "file" | "record";
}

export interface TrailTriageParsedRecord {
  readonly issue: TrailTriageIssue;
  readonly source: TrailRecordSourceRange;
}

export interface TrailTriageContribution {
  readonly filePath: string;
  readonly issuesById: Readonly<Record<string, TrailTriageIssue>>;
  readonly sourceByIssueId: Readonly<Record<string, TrailRecordSourceRange>>;
}

export interface TrailTriageParseResult {
  readonly contribution: TrailTriageContribution;
  readonly issues: readonly TrailTriageParseIssue[];
}

export interface ParseTriageMarkdownInput {
  readonly filePath: string;
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
}

export type TriageMarkdownMutationErrorCode =
  | "conflict"
  | "duplicate-id"
  | "source-invalid"
  | "target-missing"
  | "verification-failed";

export class TriageMarkdownMutationError extends Error {
  public constructor(
    readonly code: TriageMarkdownMutationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TriageMarkdownMutationError";
  }
}

const DATA_MARKER = /^<!-- data (\{.*\}) -->$/;
const ISSUE_METADATA_KEYS = new Set([
  "id",
  "context",
  "statusDefinitionId",
  "projectId",
  "milestoneId",
  "priority",
  "estimate",
  "due",
  "labelIds",
  "createdAt",
  "firstStartedAt",
  "terminalAt",
]);

interface FrontmatterSlice {
  readonly bodyStartOffset: number;
  readonly yaml: string;
}

interface RecordCandidate {
  readonly issue: TrailTriageIssue;
  readonly source: TrailRecordSourceRange;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredOffset(
  node: RootChild,
  edge: "end" | "start",
): number {
  const offset = node.position?.[edge].offset;
  if (offset === undefined) {
    throw new Error(`mdast node is missing ${edge} offset`);
  }
  return offset;
}

function headingText(node: HeadingNode): string {
  const read = (child: unknown): string => {
    if (!isRecord(child)) {
      return "";
    }
    if (typeof child.value === "string") {
      return child.value;
    }
    if (Array.isArray(child.children)) {
      return child.children.map(read).join("");
    }
    return "";
  };

  return node.children.map(read).join("");
}

function isHeading(node: RootChild, depth: number): node is HeadingNode {
  return node.type === "heading" && node.depth === depth;
}

function markerJson(node: RootChild | undefined): string | null {
  if (node?.type !== "html") {
    return null;
  }
  return DATA_MARKER.exec(node.value.trim())?.[1] ?? null;
}

function isDataMarker(node: RootChild): node is HtmlNode {
  return markerJson(node) !== null;
}

function readLine(
  text: string,
  startOffset: number,
): { readonly endOffset: number; readonly nextOffset: number; readonly text: string } {
  let endOffset = startOffset;
  while (
    endOffset < text.length
    && text[endOffset] !== "\n"
    && text[endOffset] !== "\r"
  ) {
    endOffset += 1;
  }

  let nextOffset = endOffset;
  if (text[nextOffset] === "\r") {
    nextOffset += 1;
  }
  if (text[nextOffset] === "\n") {
    nextOffset += 1;
  }

  return {
    endOffset,
    nextOffset,
    text: text.slice(startOffset, endOffset),
  };
}

function splitFrontmatter(markdown: string): FrontmatterSlice | null {
  const firstOffset = markdown.startsWith("\uFEFF") ? 1 : 0;
  const firstLine = readLine(markdown, firstOffset);
  if (firstLine.text.trim() !== "---") {
    return null;
  }

  const yamlStart = firstLine.nextOffset;
  let lineStart = yamlStart;

  while (lineStart <= markdown.length) {
    const line = readLine(markdown, lineStart);
    if (line.text.trim() === "---") {
      return {
        bodyStartOffset: line.nextOffset,
        yaml: markdown.slice(yamlStart, lineStart),
      };
    }
    if (line.nextOffset <= lineStart) {
      break;
    }
    lineStart = line.nextOffset;
  }

  return null;
}

function normalizeDescription(markdown: string): string | undefined {
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const result = lines.join("\n");
  return result.length > 0 ? result : undefined;
}

function parseOptionalString(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): string | undefined {
  const value = metadata[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${key} must be non-empty text when present`);
    return undefined;
  }
  return value;
}

function parseLabelIds(
  value: unknown,
  issues: string[],
): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push("labelIds must be an array when present");
    return [];
  }

  const seen = new Set<string>();
  const labels: string[] = [];
  value.forEach((label, index) => {
    if (typeof label !== "string" || label.trim().length === 0) {
      issues.push(`labelIds[${index}] must be non-empty text`);
      return;
    }
    if (seen.has(label)) {
      issues.push(`labelIds contains duplicate ID: ${label}`);
      return;
    }
    seen.add(label);
    labels.push(label);
  });

  return labels.sort();
}

function parseTriageMetadata(
  raw: string,
): { readonly issue?: Omit<TrailTriageIssue, "description" | "title">; readonly issues: string[] } {
  const issues: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { issues: ["data marker must contain valid JSON"] };
  }

  if (!isRecord(parsed)) {
    return { issues: ["data marker JSON must be an object"] };
  }

  for (const key of Object.keys(parsed)) {
    if (!ISSUE_METADATA_KEYS.has(key)) {
      issues.push(`unknown Issue metadata field: ${key}`);
    }
  }

  const id = parsed.id;
  if (typeof id !== "string" || id.trim().length === 0) {
    issues.push("id must be non-empty text");
  }

  if (parsed.context !== "triage") {
    issues.push("context must be triage in Triage.md");
  }

  if (!isTrailEpochMilliseconds(parsed.due)) {
    issues.push("due must be a non-negative epoch-millisecond integer");
  }

  for (const workflowOnly of [
    "statusDefinitionId",
    "createdAt",
    "firstStartedAt",
    "terminalAt",
  ] as const) {
    if (parsed[workflowOnly] !== undefined) {
      issues.push(`${workflowOnly} is not valid on a Triage Issue`);
    }
  }

  const projectId = parseOptionalString(parsed, "projectId", issues);
  const milestoneId = parseOptionalString(parsed, "milestoneId", issues);
  if (milestoneId !== undefined && projectId === undefined) {
    issues.push("milestoneId requires projectId");
  }

  let priority: TrailTriageIssue["priority"];
  if (parsed.priority !== undefined) {
    if (!isTrailPriority(parsed.priority)) {
      issues.push("priority must be urgent, high, medium, or low");
    } else {
      priority = parsed.priority;
    }
  }

  let estimate: number | undefined;
  if (parsed.estimate !== undefined) {
    if (
      typeof parsed.estimate !== "number"
      || !Number.isSafeInteger(parsed.estimate)
      || parsed.estimate < 0
    ) {
      issues.push("estimate must be a non-negative integer when present");
    } else {
      estimate = parsed.estimate;
    }
  }

  const labelIds = parseLabelIds(parsed.labelIds, issues);

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues,
    issue: {
      context: "triage",
      due: parsed.due as number,
      estimate,
      id: id as string,
      labelIds,
      milestoneId,
      priority,
      projectId,
    },
  };
}

function createContribution(
  filePath: string,
  records: readonly RecordCandidate[],
): TrailTriageContribution {
  const issuesById: Record<string, TrailTriageIssue> = {};
  const sourceByIssueId: Record<string, TrailRecordSourceRange> = {};

  for (const record of records) {
    issuesById[record.issue.id] = record.issue;
    sourceByIssueId[record.issue.id] = record.source;
  }

  return {
    filePath,
    issuesById,
    sourceByIssueId,
  };
}

/**
 * Parses one authoritative Triage container. YAML interpretation is injected so
 * production can use Obsidian's parser while this physical parser stays host-free.
 */
export function parseTriageMarkdown({
  filePath,
  markdown,
  parseYaml,
}: ParseTriageMarkdownInput): TrailTriageParseResult {
  const issues: TrailTriageParseIssue[] = [];
  const frontmatter = splitFrontmatter(markdown);

  if (frontmatter === null) {
    issues.push({
      code: "triage.frontmatter.missing",
      filePath,
      message: "Triage.md requires a frontmatter block",
      scope: "file",
    });
    return {
      contribution: createContribution(filePath, []),
      issues,
    };
  }

  let frontmatterValue: unknown;
  try {
    frontmatterValue = parseYaml(frontmatter.yaml);
  } catch {
    frontmatterValue = undefined;
  }

  if (
    !isRecord(frontmatterValue)
    || Object.keys(frontmatterValue).length !== 1
    || frontmatterValue.kind !== "triage"
  ) {
    issues.push({
      code: "triage.frontmatter.invalid",
      filePath,
      message: "Triage.md frontmatter must contain exactly kind: triage",
      scope: "file",
    });
  }

  const body = markdown.slice(frontmatter.bodyStartOffset);
  const tree = fromMarkdown(body);
  const children = tree.children;
  const issuesHeadings = children
    .map((node, index) => ({ index, node }))
    .filter(({ node }) => isHeading(node, 1) && headingText(node) === "Issues");

  if (issuesHeadings.length !== 1) {
    issues.push({
      code: "triage.structure.issues-heading",
      filePath,
      message: "Triage.md requires exactly one root # Issues heading",
      scope: "file",
    });
    return {
      contribution: createContribution(filePath, []),
      issues,
    };
  }

  const issuesIndex = issuesHeadings[0].index;
  if (issuesIndex !== 0) {
    issues.push({
      code: "triage.structure.orphan-before-issues",
      filePath,
      message: "No root content may appear before # Issues",
      scope: "file",
    });
  }

  children.forEach((node, index) => {
    if (isHeading(node, 1) && index !== issuesIndex) {
      issues.push({
        code: "triage.structure.unexpected-h1",
        filePath,
        message: `Unexpected root H1: ${headingText(node)}`,
        offset: frontmatter.bodyStartOffset + requiredOffset(node, "start"),
        scope: "file",
      });
    }
  });

  const candidates: RecordCandidate[] = [];
  let index = issuesIndex + 1;

  while (index < children.length) {
    const node = children[index];
    if (!isHeading(node, 2)) {
      issues.push({
        code: "triage.structure.orphan-content",
        filePath,
        message: "Root content in Triage.md must belong to an H2 Issue record",
        offset: frontmatter.bodyStartOffset + requiredOffset(node, "start"),
        scope: "file",
      });
      index += 1;
      continue;
    }

    let nextBoundary = index + 1;
    while (nextBoundary < children.length) {
      const candidate = children[nextBoundary];
      if (
        candidate.type === "heading"
        && (candidate.depth === 1 || candidate.depth === 2)
      ) {
        break;
      }
      nextBoundary += 1;
    }

    const recordChildren = children.slice(index + 1, nextBoundary);
    const markerNodes = recordChildren.filter(isDataMarker);
    const immediateMarker = recordChildren[0];
    const json = markerJson(immediateMarker);
    const title = normalizeTrailTitle(headingText(node));
    const recordStart = requiredOffset(node, "start");
    const recordEnd =
      nextBoundary < children.length
        ? requiredOffset(children[nextBoundary], "start")
        : body.length;

    if (!isValidTrailTitle(title)) {
      issues.push({
        code: "triage.record.title-invalid",
        filePath,
        message: "Triage Issue title must be non-empty single-line text",
        offset: frontmatter.bodyStartOffset + recordStart,
        scope: "record",
      });
    }

    if (json === null) {
      issues.push({
        code: "triage.record.marker-position",
        filePath,
        message: `Metadata marker must immediately follow H2: ${title}`,
        offset: frontmatter.bodyStartOffset + recordStart,
        scope: "record",
      });
    }
    if (markerNodes.length !== 1) {
      issues.push({
        code: "triage.record.marker-count",
        filePath,
        message: `Expected exactly one metadata marker for H2: ${title}`,
        offset: frontmatter.bodyStartOffset + recordStart,
        scope: "record",
      });
    }

    if (json !== null && markerNodes.length === 1 && isValidTrailTitle(title)) {
      const metadata = parseTriageMetadata(json);
      const objectId = metadata.issue?.id;
      if (metadata.issues.length > 0) {
        metadata.issues.forEach((message) => {
          issues.push({
            code: "triage.record.metadata-invalid",
            filePath,
            message,
            objectId,
            offset:
              frontmatter.bodyStartOffset
              + requiredOffset(immediateMarker, "start"),
            scope: "record",
          });
        });
      } else if (metadata.issue) {
        const markerEnd = requiredOffset(immediateMarker, "end");
        candidates.push({
          issue: {
            ...metadata.issue,
            description: normalizeDescription(body.slice(markerEnd, recordEnd)),
            title,
          },
          source: {
            endOffset: frontmatter.bodyStartOffset + recordEnd,
            filePath,
            markerEndOffset: frontmatter.bodyStartOffset + markerEnd,
            markerStartOffset:
              frontmatter.bodyStartOffset
              + requiredOffset(immediateMarker, "start"),
            startOffset: frontmatter.bodyStartOffset + recordStart,
          },
        });
      }
    }

    index = nextBoundary;
  }

  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    counts.set(candidate.issue.id, (counts.get(candidate.issue.id) ?? 0) + 1);
  }
  const duplicateIds = new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id]) => id),
  );

  for (const duplicateId of duplicateIds) {
    issues.push({
      code: "triage.record.id-duplicate",
      filePath,
      message: `Duplicate Triage Issue ID: ${duplicateId}`,
      objectId: duplicateId,
      scope: "record",
    });
  }

  return {
    contribution: createContribution(
      filePath,
      candidates.filter((candidate) => !duplicateIds.has(candidate.issue.id)),
    ),
    issues,
  };
}

function canonicalMetadata(issue: TrailTriageIssue): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    id: issue.id,
    context: "triage",
  };

  if (issue.projectId !== undefined) {
    metadata.projectId = issue.projectId;
  }
  if (issue.milestoneId !== undefined) {
    metadata.milestoneId = issue.milestoneId;
  }
  if (issue.priority !== undefined) {
    metadata.priority = issue.priority;
  }
  if (issue.estimate !== undefined) {
    metadata.estimate = issue.estimate;
  }

  metadata.due = issue.due;

  if (issue.labelIds.length > 0) {
    metadata.labelIds = [...issue.labelIds].sort();
  }

  return metadata;
}

export function serializeTriageIssue(issue: TrailTriageIssue): string {
  if (!isValidTrailTitle(issue.title)) {
    throw new TriageMarkdownMutationError(
      "verification-failed",
      "Cannot serialize an invalid Triage Issue title",
    );
  }
  if (!isTrailEpochMilliseconds(issue.due)) {
    throw new TriageMarkdownMutationError(
      "verification-failed",
      "Cannot serialize an invalid Triage Issue due timestamp",
    );
  }
  if (issue.milestoneId !== undefined && issue.projectId === undefined) {
    throw new TriageMarkdownMutationError(
      "verification-failed",
      "Cannot serialize milestoneId without projectId",
    );
  }

  const lines = [
    `## ${normalizeTrailTitle(issue.title)}`,
    `<!-- data ${JSON.stringify(canonicalMetadata(issue))} -->`,
  ];
  const description = issue.description === undefined
    ? undefined
    : normalizeDescription(issue.description);

  if (description !== undefined) {
    lines.push("", description);
  }

  return lines.join("\n");
}

/**
 * Pure latest-snapshot transform suitable for Obsidian Vault.process. It parses
 * the latest container, appends one record, then reparses the generated result.
 */
export function appendTriageIssueToMarkdown(
  input: ParseTriageMarkdownInput & { readonly issue: TrailTriageIssue },
): string {
  const current = parseTriageMarkdown(input);
  if (current.issues.length > 0) {
    throw new TriageMarkdownMutationError(
      "source-invalid",
      "Refused to append to an invalid Triage source",
    );
  }
  if (current.contribution.issuesById[input.issue.id] !== undefined) {
    throw new TriageMarkdownMutationError(
      "duplicate-id",
      `Triage Issue already exists: ${input.issue.id}`,
    );
  }

  const block = serializeTriageIssue(input.issue);
  const base = input.markdown.replace(/[\r\n]+$/, "");
  const next = `${base}\n\n${block}\n`;
  const verified = parseTriageMarkdown({
    filePath: input.filePath,
    markdown: next,
    parseYaml: input.parseYaml,
  });

  if (
    verified.issues.length > 0
    || verified.contribution.issuesById[input.issue.id] === undefined
  ) {
    throw new TriageMarkdownMutationError(
      "verification-failed",
      "Generated Triage Markdown failed verification",
    );
  }

  return next;
}


interface TriageIssueMutationInput extends ParseTriageMarkdownInput {
  readonly expectedIssue: TrailTriageIssue;
}

function requireCurrentTriageRecord(
  input: TriageIssueMutationInput,
): {
  readonly issue: TrailTriageIssue;
  readonly source: TrailRecordSourceRange;
} {
  const current = parseTriageMarkdown(input);
  if (current.issues.length > 0) {
    throw new TriageMarkdownMutationError(
      "source-invalid",
      "Refused to mutate an invalid Triage source",
    );
  }

  const issue = current.contribution.issuesById[input.expectedIssue.id];
  const source = current.contribution.sourceByIssueId[input.expectedIssue.id];
  if (issue === undefined || source === undefined) {
    throw new TriageMarkdownMutationError(
      "target-missing",
      `Triage Issue is missing: ${input.expectedIssue.id}`,
    );
  }
  if (!sameTrailTriageIssue(issue, input.expectedIssue)) {
    throw new TriageMarkdownMutationError(
      "conflict",
      `Triage Issue changed before mutation: ${input.expectedIssue.id}`,
    );
  }

  return { issue, source };
}

/**
 * Replaces only the record heading and metadata marker on the latest valid
 * snapshot. The Markdown body stays byte-for-byte untouched.
 */
export function updateTriageIssueInMarkdown(
  input: TriageIssueMutationInput & { readonly issue: TrailTriageIssue },
): string {
  if (input.issue.id !== input.expectedIssue.id) {
    throw new TriageMarkdownMutationError(
      "verification-failed",
      "Triage Issue update cannot change stable identity",
    );
  }

  // Reuse serializer validation without using its body-normalizing output.
  serializeTriageIssue(input.issue);
  const current = requireCurrentTriageRecord(input);
  const headingLine = readLine(input.markdown, current.source.startOffset);
  const nextMarker = `<!-- data ${JSON.stringify(canonicalMetadata(input.issue))} -->`;

  // Apply the later marker replacement first so the earlier heading offsets remain
  // valid even when metadata length changes.
  let next = [
    input.markdown.slice(0, current.source.markerStartOffset),
    nextMarker,
    input.markdown.slice(current.source.markerEndOffset),
  ].join("");
  next = [
    next.slice(0, current.source.startOffset),
    `## ${normalizeTrailTitle(input.issue.title)}`,
    next.slice(headingLine.endOffset),
  ].join("");

  const verified = parseTriageMarkdown({
    filePath: input.filePath,
    markdown: next,
    parseYaml: input.parseYaml,
  });
  const verifiedIssue = verified.contribution.issuesById[input.issue.id];
  if (
    verified.issues.length > 0
    || verifiedIssue === undefined
    || !sameTrailTriageIssue(verifiedIssue, input.issue)
  ) {
    throw new TriageMarkdownMutationError(
      "verification-failed",
      "Generated Triage Issue update failed verification",
    );
  }

  return next;
}

/** Removes exactly one guarded record from the latest valid Triage snapshot. */
export function deleteTriageIssueFromMarkdown(
  input: TriageIssueMutationInput,
): string {
  const current = requireCurrentTriageRecord(input);
  const next = [
    input.markdown.slice(0, current.source.startOffset),
    input.markdown.slice(current.source.endOffset),
  ].join("");
  const verified = parseTriageMarkdown({
    filePath: input.filePath,
    markdown: next,
    parseYaml: input.parseYaml,
  });

  if (
    verified.issues.length > 0
    || verified.contribution.issuesById[input.expectedIssue.id] !== undefined
  ) {
    throw new TriageMarkdownMutationError(
      "verification-failed",
      "Generated Triage Issue deletion failed verification",
    );
  }

  return next;
}
