import {
  isTrailEpochMilliseconds,
  isValidTrailTitle,
  normalizeTrailTitle,
  sameTrailTriageIssue,
  type TrailTriageIssue,
} from "../../domain/trail-issue";
import {
  appendMarkdownBlock,
  collectMarkdownH2Records,
  isMarkdownHeading,
  markdownHeadingText,
  normalizeMarkdownRecordBody,
  parseMarkdownBody,
  removeMarkdownRange,
  replaceMarkdownHeadingAndMarker,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
  type TrailRecordSourceRange,
} from "../core/trail-markdown-core";
import {
  canonicalTriageIssueMetadata,
  fileCodecIssue,
  parseExactFrontmatter,
  parseTriageIssueMetadata,
  recordCodecIssue,
  type TrailCodecIssue,
  type TrailYamlParser,
} from "./trail-codec-support";

export type TrailTriageParseIssue = TrailCodecIssue;
export type { TrailYamlParser } from "./trail-codec-support";

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

interface RecordCandidate {
  readonly issue: TrailTriageIssue;
  readonly source: TrailRecordSourceRange;
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
  return { filePath, issuesById, sourceByIssueId };
}

export function parseTriageMarkdown({
  filePath,
  markdown,
  parseYaml,
}: ParseTriageMarkdownInput): TrailTriageParseResult {
  const issues: TrailTriageParseIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(markdown);
  if (frontmatter === null) {
    return {
      contribution: createContribution(filePath, []),
      issues: [fileCodecIssue(
        "triage.frontmatter.missing",
        filePath,
        "Triage.md requires a frontmatter block",
      )],
    };
  }

  const frontmatterIssues = parseExactFrontmatter(
    frontmatter.yaml,
    parseYaml,
    { kind: "triage" },
  );
  if (frontmatterIssues.length > 0) {
    issues.push(fileCodecIssue(
      "triage.frontmatter.invalid",
      filePath,
      "Triage.md frontmatter must contain exactly kind: triage",
    ));
  }

  const body = markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  const issuesHeadings = children
    .map((node, index) => ({ index, node }))
    .filter(({ node }) => isMarkdownHeading(node, 1) && markdownHeadingText(node) === "Issues");

  if (issuesHeadings.length !== 1) {
    issues.push(fileCodecIssue(
      "triage.structure.issues-heading",
      filePath,
      "Triage.md requires exactly one root # Issues heading",
    ));
    return { contribution: createContribution(filePath, []), issues };
  }

  const issuesIndex = issuesHeadings[0].index;
  if (issuesIndex !== 0) {
    issues.push(fileCodecIssue(
      "triage.structure.orphan-before-issues",
      filePath,
      "No root content may appear before # Issues",
    ));
  }

  children.forEach((node, index) => {
    if (isMarkdownHeading(node, 1) && index !== issuesIndex) {
      issues.push(fileCodecIssue(
        "triage.structure.unexpected-h1",
        filePath,
        `Unexpected root H1: ${markdownHeadingText(node)}`,
        frontmatter.bodyStartOffset + requiredMarkdownOffset(node, "start"),
      ));
    }
  });

  const region = collectMarkdownH2Records(body, children, issuesIndex + 1);
  for (const orphan of region.orphanNodes) {
    issues.push(fileCodecIssue(
      "triage.structure.orphan-content",
      filePath,
      "Root content in Triage.md must belong to an H2 Issue record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(orphan, "start"),
    ));
  }

  const candidates: RecordCandidate[] = [];
  for (const record of region.records) {
    const title = normalizeTrailTitle(record.title);
    const recordOffset = frontmatter.bodyStartOffset + record.startOffset;
    if (!isValidTrailTitle(title)) {
      issues.push(recordCodecIssue(
        "triage.record.title-invalid",
        filePath,
        "Triage Issue title must be non-empty single-line text",
        undefined,
        recordOffset,
      ));
    }
    if (record.markerJson === null || record.immediateMarker === undefined) {
      issues.push(recordCodecIssue(
        "triage.record.marker-position",
        filePath,
        `Metadata marker must immediately follow H2: ${title}`,
        undefined,
        recordOffset,
      ));
    }
    if (record.markerCount !== 1) {
      issues.push(recordCodecIssue(
        "triage.record.marker-count",
        filePath,
        `Expected exactly one metadata marker for H2: ${title}`,
        undefined,
        recordOffset,
      ));
    }

    if (
      record.markerJson === null
      || record.immediateMarker === undefined
      || record.markerCount !== 1
      || !isValidTrailTitle(title)
    ) {
      continue;
    }

    const metadata = parseTriageIssueMetadata(record.markerJson);
    const objectId = metadata.issue?.id;
    const markerStart = requiredMarkdownOffset(record.immediateMarker, "start");
    metadata.issues.forEach((message) => {
      issues.push(recordCodecIssue(
        "triage.record.metadata-invalid",
        filePath,
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
        filePath,
        markerEndOffset: frontmatter.bodyStartOffset + markerEnd,
        markerStartOffset: frontmatter.bodyStartOffset + markerStart,
        startOffset: frontmatter.bodyStartOffset + record.startOffset,
      },
    });
  }

  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    counts.set(candidate.issue.id, (counts.get(candidate.issue.id) ?? 0) + 1);
  }
  const duplicateIds = new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );
  for (const duplicateId of duplicateIds) {
    issues.push(recordCodecIssue(
      "triage.record.id-duplicate",
      filePath,
      `Duplicate Triage Issue ID: ${duplicateId}`,
      duplicateId,
    ));
  }

  return {
    contribution: createContribution(
      filePath,
      candidates.filter((candidate) => !duplicateIds.has(candidate.issue.id)),
    ),
    issues,
  };
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
    `<!-- data ${JSON.stringify(canonicalTriageIssueMetadata(issue))} -->`,
  ];
  const description = issue.description === undefined
    ? undefined
    : normalizeMarkdownRecordBody(issue.description);
  if (description !== undefined) {
    lines.push("", description);
  }
  return lines.join("\n");
}

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

  const next = appendMarkdownBlock(input.markdown, serializeTriageIssue(input.issue));
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

export function updateTriageIssueInMarkdown(
  input: TriageIssueMutationInput & { readonly issue: TrailTriageIssue },
): string {
  if (input.issue.id !== input.expectedIssue.id) {
    throw new TriageMarkdownMutationError(
      "verification-failed",
      "Triage Issue update cannot change stable identity",
    );
  }
  serializeTriageIssue(input.issue);
  const current = requireCurrentTriageRecord(input);
  const next = replaceMarkdownHeadingAndMarker(input.markdown, {
    heading: `## ${normalizeTrailTitle(input.issue.title)}`,
    marker: `<!-- data ${JSON.stringify(canonicalTriageIssueMetadata(input.issue))} -->`,
    markerEndOffset: current.source.markerEndOffset,
    markerStartOffset: current.source.markerStartOffset,
    recordStartOffset: current.source.startOffset,
  });
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

export function deleteTriageIssueFromMarkdown(
  input: TriageIssueMutationInput,
): string {
  const current = requireCurrentTriageRecord(input);
  const next = removeMarkdownRange(
    input.markdown,
    current.source.startOffset,
    current.source.endOffset,
  );
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
