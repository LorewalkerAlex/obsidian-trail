import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
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
  canonicalWorkflowIssueMetadata,
  entityCodecIssue,
  markerOffset,
  parseExactFrontmatter,
  parseWorkflowIssueMetadata,
  serializeDataMarker,
  sourceCodecIssue,
  validateRecordEnvelope,
  type TrailCodecIssue,
  type TrailYamlParser,
} from "./trail-codec-support";

export interface TrailProjectlessIssuesSourceDocument {
  readonly issues: readonly TrailWorkflowIssue[];
  readonly locationsByIssueId: Readonly<Record<string, TrailRecordSourceRange>>;
  readonly sourcePath: string;
}

export interface TrailProjectlessIssuesParseResult {
  readonly document?: TrailProjectlessIssuesSourceDocument;
  readonly issues: readonly TrailCodecIssue[];
}

export function parseProjectlessIssuesMarkdown(input: {
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
  readonly sourcePath: string;
}): TrailProjectlessIssuesParseResult {
  const issues: TrailCodecIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return { issues: [sourceCodecIssue("projectless.frontmatter.missing", input.sourcePath, "Projectless Issues requires frontmatter")] };
  }
  if (parseExactFrontmatter(frontmatter.yaml, input.parseYaml, { kind: TRAIL_PHYSICAL_SOURCE_SCHEMAS["projectless-issues"].frontmatterKind }).length > 0) {
    return { issues: [sourceCodecIssue("projectless.frontmatter.invalid", input.sourcePath, "Projectless Issues frontmatter must contain exactly kind: projectless-issues", undefined, "field")] };
  }

  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  if (
    children.length === 0
    || !isMarkdownHeading(children[0], 1)
    || markdownHeadingText(children[0]) !== TRAIL_PHYSICAL_SOURCE_SCHEMAS["projectless-issues"].rootSections[0]
    || children.filter((node) => isMarkdownHeading(node, 1)).length !== 1
  ) {
    return { issues: [sourceCodecIssue("projectless.structure.invalid", input.sourcePath, "Projectless Issues requires exactly one root # Issues section")] };
  }

  const region = collectMarkdownH2Records(body, children, 1);
  for (const orphan of region.orphanNodes) {
    issues.push(sourceCodecIssue(
      "projectless.structure.orphan-content",
      input.sourcePath,
      "Root content must belong to an H2 Workflow Issue record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(orphan, "start"),
    ));
  }

  const accepted: Array<{ readonly issue: TrailWorkflowIssue; readonly source: TrailRecordSourceRange }> = [];
  for (const record of region.records) {
    if (!validateRecordEnvelope(record, {
      bodyStartOffset: frontmatter.bodyStartOffset,
      codePrefix: "projectless.issue",
      entityKind: "issue",
      label: "Workflow Issue",
      sourcePath: input.sourcePath,
    }, issues)) continue;

    const parsed = parseWorkflowIssueMetadata(record.markerJson!, { kind: "projectless" });
    const entityId = parsed.issue?.id;
    for (const message of parsed.issues) {
      issues.push(entityCodecIssue(
        "projectless.issue.metadata-invalid",
        input.sourcePath,
        "issue",
        message,
        { entityId, offset: markerOffset(record, frontmatter.bodyStartOffset) },
      ));
    }
    if (parsed.issue === undefined || parsed.issues.length > 0) continue;

    const markerEnd = requiredMarkdownOffset(record.immediateMarker!, "end");
    const issue: TrailWorkflowIssue = {
      ...parsed.issue,
      description: normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)),
      title: normalizeTrailTitle(record.title),
    };
    const domainIssues = validateTrailIssue(issue);
    if (domainIssues.length > 0) {
      for (const domainIssue of domainIssues) {
        issues.push(entityCodecIssue(
          `projectless.issue.domain.${domainIssue.code}`,
          input.sourcePath,
          "issue",
          domainIssue.message,
          { entityId: issue.id, field: domainIssue.field, stage: "domain" },
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
    issues.push(entityCodecIssue("projectless.issue.id-duplicate", input.sourcePath, "issue", `Duplicate Workflow Issue ID: ${id}`, { entityId: id }));
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

export function serializeProjectlessWorkflowIssue(issue: TrailWorkflowIssue): string {
  const validation = validateTrailIssue(issue);
  if (validation.length > 0 || issue.projectId !== undefined || issue.milestoneId !== undefined) {
    throw new Error("Cannot serialize invalid Projectless Workflow Issue");
  }
  const lines = [
    `## ${normalizeTrailTitle(issue.title)}`,
    serializeDataMarker(TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder, canonicalWorkflowIssueMetadata(issue)),
  ];
  const description = issue.description === undefined ? undefined : normalizeMarkdownRecordBody(issue.description);
  if (description !== undefined) lines.push("", description);
  return lines.join("\n");
}

export function serializeProjectlessIssuesMarkdown(issues: readonly TrailWorkflowIssue[]): string {
  return [
    "---",
    `kind: ${TRAIL_PHYSICAL_SOURCE_SCHEMAS["projectless-issues"].frontmatterKind}`,
    "---",
    "",
    `# ${TRAIL_PHYSICAL_SOURCE_SCHEMAS["projectless-issues"].rootSections[0]}`,
    ...issues.flatMap((issue) => ["", serializeProjectlessWorkflowIssue(issue)]),
    "",
  ].join("\n");
}
