import type { TrailTriageIssue } from "../../domain/model/trail-entities";
import { validateTrailIssue } from "../../domain/validation/trail-record-validation";
import { normalizeTrailTitle } from "../../domain/validation/trail-value-validation";
import {
  collectMarkdownH2Records,
  isMarkdownHeading,
  markdownHeadingText,
  normalizeMarkdownRecordBody,
  parseMarkdownBody,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
  type TrailRecordSourceRange,
} from "../core/trail-markdown-core";
import {
  TRAIL_PHYSICAL_RECORD_SCHEMAS,
  TRAIL_PHYSICAL_SOURCE_SCHEMAS,
} from "../schema/trail-physical-schema";
import {
  canonicalTriageIssueMetadata,
  entityCodecIssue,
  markerOffset,
  parseExactFrontmatter,
  parseTriageIssueMetadata,
  serializeDataMarker,
  sourceCodecIssue,
  validateRecordEnvelope,
  type TrailCodecIssue,
  type TrailYamlParser,
} from "./trail-codec-support";

export interface TrailTriageSourceDocument {
  readonly issues: readonly TrailTriageIssue[];
  readonly locationsByIssueId: Readonly<Record<string, TrailRecordSourceRange>>;
  readonly sourcePath: string;
}

export interface TrailTriageParseResult {
  readonly document?: TrailTriageSourceDocument;
  readonly issues: readonly TrailCodecIssue[];
}

export function parseTriageMarkdown(input: {
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
  readonly sourcePath: string;
}): TrailTriageParseResult {
  const issues: TrailCodecIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return { issues: [sourceCodecIssue("triage.frontmatter.missing", input.sourcePath, "Triage.md requires frontmatter")] };
  }
  if (parseExactFrontmatter(frontmatter.yaml, input.parseYaml, { kind: TRAIL_PHYSICAL_SOURCE_SCHEMAS.triage.frontmatterKind }).length > 0) {
    return { issues: [sourceCodecIssue("triage.frontmatter.invalid", input.sourcePath, "Triage.md frontmatter must contain exactly kind: triage", undefined, "field")] };
  }

  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  if (
    children.length === 0
    || !isMarkdownHeading(children[0], 1)
    || markdownHeadingText(children[0]) !== TRAIL_PHYSICAL_SOURCE_SCHEMAS.triage.rootSections[0]
    || children.filter((node) => isMarkdownHeading(node, 1)).length !== 1
  ) {
    return { issues: [sourceCodecIssue("triage.structure.invalid", input.sourcePath, "Triage.md requires exactly one root # Issues section")] };
  }

  const region = collectMarkdownH2Records(body, children, 1);
  for (const orphan of region.orphanNodes) {
    issues.push(sourceCodecIssue(
      "triage.structure.orphan-content",
      input.sourcePath,
      "Root content in Triage.md must belong to an H2 Issue record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(orphan, "start"),
    ));
  }

  const accepted: Array<{ readonly issue: TrailTriageIssue; readonly source: TrailRecordSourceRange }> = [];
  for (const record of region.records) {
    if (!validateRecordEnvelope(record, {
      bodyStartOffset: frontmatter.bodyStartOffset,
      codePrefix: "triage.issue",
      entityKind: "issue",
      label: "Triage Issue",
      sourcePath: input.sourcePath,
    }, issues)) continue;

    const parsed = parseTriageIssueMetadata(record.markerJson!);
    const entityId = parsed.issue?.id;
    for (const message of parsed.issues) {
      issues.push(entityCodecIssue(
        "triage.issue.metadata-invalid",
        input.sourcePath,
        "issue",
        message,
        { entityId, offset: markerOffset(record, frontmatter.bodyStartOffset) },
      ));
    }
    if (parsed.issue === undefined || parsed.issues.length > 0) continue;

    const markerEnd = requiredMarkdownOffset(record.immediateMarker!, "end");
    const issue: TrailTriageIssue = {
      ...parsed.issue,
      description: normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)),
      title: normalizeTrailTitle(record.title),
    };
    const domainIssues = validateTrailIssue(issue);
    if (domainIssues.length > 0) {
      for (const domainIssue of domainIssues) {
        issues.push(entityCodecIssue(
          `triage.issue.domain.${domainIssue.code}`,
          input.sourcePath,
          "issue",
          domainIssue.message,
          {
            entityId: issue.id,
            field: domainIssue.field,
            offset: markerOffset(record, frontmatter.bodyStartOffset),
            stage: "domain",
          },
        ));
      }
      continue;
    }

    accepted.push({
      issue,
      source: {
        endOffset: frontmatter.bodyStartOffset + record.endOffset,
        filePath: input.sourcePath,
        markerEndOffset: frontmatter.bodyStartOffset + markerEnd,
        markerStartOffset: frontmatter.bodyStartOffset + requiredMarkdownOffset(record.immediateMarker!, "start"),
        startOffset: frontmatter.bodyStartOffset + record.startOffset,
      },
    });
  }

  const counts = new Map<string, number>();
  for (const candidate of accepted) counts.set(candidate.issue.id, (counts.get(candidate.issue.id) ?? 0) + 1);
  const duplicateIds = new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
  for (const id of duplicateIds) {
    issues.push(entityCodecIssue("triage.issue.id-duplicate", input.sourcePath, "issue", `Duplicate Triage Issue ID: ${id}`, { entityId: id }));
  }
  const unique = accepted.filter(({ issue }) => !duplicateIds.has(issue.id));

  return {
    document: {
      issues: unique.map(({ issue }) => issue),
      locationsByIssueId: Object.fromEntries(unique.map(({ issue, source }) => [issue.id, source])),
      sourcePath: input.sourcePath,
    },
    issues,
  };
}

export function serializeTriageIssue(issue: TrailTriageIssue): string {
  const validation = validateTrailIssue(issue);
  if (validation.length > 0) throw new Error(`Cannot serialize invalid Triage Issue: ${validation.map((item) => item.message).join("; ")}`);
  const lines = [
    `## ${normalizeTrailTitle(issue.title)}`,
    serializeDataMarker(TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder, canonicalTriageIssueMetadata(issue)),
  ];
  const description = issue.description === undefined ? undefined : normalizeMarkdownRecordBody(issue.description);
  if (description !== undefined) lines.push("", description);
  return lines.join("\n");
}

export function serializeTriageMarkdown(issues: readonly TrailTriageIssue[]): string {
  return [
    "---",
    `kind: ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.triage.frontmatterKind}`,
    "---",
    "",
    `# ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.triage.rootSections[0]}`,
    ...issues.flatMap((issue) => ["", serializeTriageIssue(issue)]),
    "",
  ].join("\n");
}
