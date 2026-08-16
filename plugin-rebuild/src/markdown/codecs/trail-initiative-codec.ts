import type { TrailInitiative } from "../../domain/model/trail-entities";
import { validateTrailInitiative } from "../../domain/validation/trail-record-validation";
import { isTrailTitle, normalizeTrailTitle } from "../../domain/validation/trail-value-validation";
import {
  collectMarkdownH2Records,
  isMarkdownHeading,
  markdownHeadingText,
  normalizeMarkdownRecordBody,
  parseMarkdownBody,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
} from "../core/trail-markdown-core";
import {
  TRAIL_PHYSICAL_RECORD_SCHEMAS,
  TRAIL_PHYSICAL_SOURCE_SCHEMAS,
} from "../schema/trail-physical-schema";
import {
  canonicalIdSet,
  entityCodecIssue,
  markerOffset,
  parseExactFrontmatter,
  parseIdSet,
  parseJsonObject,
  parseOptionalPriority,
  parseOptionalTimestamp,
  rejectUnknownKeys,
  serializeDataMarker,
  sourceCodecIssue,
  validateRecordEnvelope,
  type TrailCodecIssue,
  type TrailYamlParser,
} from "./trail-codec-support";

export interface TrailInitiativeSourceDocument {
  readonly initiative: TrailInitiative;
  readonly sourcePath: string;
}

export interface TrailInitiativeParseResult {
  readonly document?: TrailInitiativeSourceDocument;
  readonly issues: readonly TrailCodecIssue[];
}

export function parseInitiativeMarkdown(input: {
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
  readonly sourcePath: string;
}): TrailInitiativeParseResult {
  const issues: TrailCodecIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return { issues: [sourceCodecIssue("initiative.frontmatter.missing", input.sourcePath, "Initiative file requires frontmatter")] };
  }

  const frontmatterIssues = parseExactFrontmatter(frontmatter.yaml, input.parseYaml, {
    kind: TRAIL_PHYSICAL_SOURCE_SCHEMAS.initiative.frontmatterKind,
    id: "<id>",
  });
  if (frontmatterIssues.length > 0) {
    return {
      issues: [sourceCodecIssue(
        "initiative.frontmatter.invalid",
        input.sourcePath,
        frontmatterIssues.join("; "),
        undefined,
        "field",
      )],
    };
  }

  const parsedYaml = input.parseYaml(frontmatter.yaml) as Record<string, unknown>;
  const initiativeId = parsedYaml.id as string;
  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  const h1 = children.filter((node) => isMarkdownHeading(node, 1));
  if (h1.length !== 1 || children[0] !== h1[0] || markdownHeadingText(h1[0]) !== TRAIL_PHYSICAL_SOURCE_SCHEMAS.initiative.rootSections[0]) {
    return {
      issues: [sourceCodecIssue(
        "initiative.structure.invalid",
        input.sourcePath,
        "Initiative file requires exactly one root # Initiative section",
      )],
    };
  }

  const region = collectMarkdownH2Records(body, children, 1);
  if (region.records.length !== 1 || region.orphanNodes.length > 0) {
    return {
      issues: [sourceCodecIssue(
        "initiative.record.count",
        input.sourcePath,
        "# Initiative must contain exactly one H2 Initiative record",
      )],
    };
  }

  const record = region.records[0];
  if (!validateRecordEnvelope(record, {
    bodyStartOffset: frontmatter.bodyStartOffset,
    codePrefix: "initiative.record",
    entityKind: "initiative",
    label: "Initiative",
    sourcePath: input.sourcePath,
  }, issues)) {
    return { issues };
  }

  const parsed = parseJsonObject(record.markerJson!, "Initiative data marker");
  if (parsed.value === undefined) {
    return {
      issues: [entityCodecIssue(
        "initiative.metadata.invalid",
        input.sourcePath,
        "initiative",
        parsed.issues.join("; "),
        { entityId: initiativeId, offset: markerOffset(record, frontmatter.bodyStartOffset) },
      )],
    };
  }

  const fieldIssues: string[] = [];
  rejectUnknownKeys(parsed.value, TRAIL_PHYSICAL_RECORD_SCHEMAS.initiative.metadataOrder, "Initiative", fieldIssues);
  const priority = parseOptionalPriority(parsed.value, "priority", fieldIssues);
  const due = parseOptionalTimestamp(parsed.value, "due", fieldIssues);
  const labelIds = parseIdSet(parsed.value.labelIds, "labelIds", fieldIssues);
  const title = normalizeTrailTitle(record.title);
  if (!isTrailTitle(title)) fieldIssues.push("title must be non-empty single-line text");

  if (fieldIssues.length > 0) {
    return {
      issues: fieldIssues.map((message) => entityCodecIssue(
        "initiative.metadata.invalid",
        input.sourcePath,
        "initiative",
        message,
        { entityId: initiativeId, offset: markerOffset(record, frontmatter.bodyStartOffset) },
      )),
    };
  }

  const markerEnd = requiredMarkdownOffset(record.immediateMarker!, "end");
  const initiative: TrailInitiative = {
    description: normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)),
    due,
    id: initiativeId,
    labelIds,
    priority,
    title,
  };
  const domainIssues = validateTrailInitiative(initiative);
  if (domainIssues.length > 0) {
    return {
      issues: domainIssues.map((domainIssue) => entityCodecIssue(
        `initiative.domain.${domainIssue.code}`,
        input.sourcePath,
        "initiative",
        domainIssue.message,
        {
          entityId: initiative.id,
          field: domainIssue.field,
          offset: markerOffset(record, frontmatter.bodyStartOffset),
          stage: "domain",
        },
      )),
    };
  }

  return { document: { initiative, sourcePath: input.sourcePath }, issues };
}

export function serializeInitiativeMarkdown(initiative: TrailInitiative): string {
  const issues = validateTrailInitiative(initiative);
  if (issues.length > 0) throw new Error(`Cannot serialize invalid Initiative: ${issues.map((item) => item.message).join("; ")}`);

  const marker = serializeDataMarker(TRAIL_PHYSICAL_RECORD_SCHEMAS.initiative.metadataOrder, {
    priority: initiative.priority,
    due: initiative.due,
    labelIds: canonicalIdSet(initiative.labelIds),
  });
  const lines = [
    "---",
    `kind: ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.initiative.frontmatterKind}`,
    `id: ${JSON.stringify(initiative.id)}`,
    "---",
    "",
    `# ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.initiative.rootSections[0]}`,
    "",
    `## ${normalizeTrailTitle(initiative.title)}`,
    marker,
  ];
  const description = initiative.description === undefined
    ? undefined
    : normalizeMarkdownRecordBody(initiative.description);
  if (description !== undefined) lines.push("", description);
  lines.push("");
  return lines.join("\n");
}
