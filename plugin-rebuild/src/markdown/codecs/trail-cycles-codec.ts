import type { TrailCycle } from "../../domain/model/trail-entities";
import { validateTrailCycle } from "../../domain/validation/trail-record-validation";
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
  parseOptionalTimestamp,
  parseRequiredId,
  parseRequiredTimestamp,
  rejectUnknownKeys,
  serializeDataMarker,
  sourceCodecIssue,
  validateRecordEnvelope,
  type TrailCodecIssue,
  type TrailYamlParser,
} from "./trail-codec-support";

export interface TrailCyclesSourceDocument {
  readonly cycles: readonly TrailCycle[];
  readonly sourcePath: string;
}

export interface TrailCyclesParseResult {
  readonly document?: TrailCyclesSourceDocument;
  readonly issues: readonly TrailCodecIssue[];
}

export type TrailCycleLabelFormatter = (cycle: TrailCycle) => string;

export function parseCyclesMarkdown(input: {
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
  readonly sourcePath: string;
}): TrailCyclesParseResult {
  const issues: TrailCodecIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return { issues: [sourceCodecIssue("cycles.frontmatter.missing", input.sourcePath, "Cycles.md requires frontmatter")] };
  }
  if (parseExactFrontmatter(frontmatter.yaml, input.parseYaml, { kind: TRAIL_PHYSICAL_SOURCE_SCHEMAS.cycles.frontmatterKind }).length > 0) {
    return { issues: [sourceCodecIssue("cycles.frontmatter.invalid", input.sourcePath, "Cycles.md frontmatter must contain exactly kind: cycles", undefined, "field")] };
  }

  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  if (
    children.length === 0
    || !isMarkdownHeading(children[0], 1)
    || markdownHeadingText(children[0]) !== TRAIL_PHYSICAL_SOURCE_SCHEMAS.cycles.rootSections[0]
    || children.filter((node) => isMarkdownHeading(node, 1)).length !== 1
  ) {
    return { issues: [sourceCodecIssue("cycles.structure.invalid", input.sourcePath, "Cycles.md requires exactly one root # Cycles section")] };
  }

  const region = collectMarkdownH2Records(body, children, 1);
  for (const orphan of region.orphanNodes) {
    issues.push(sourceCodecIssue(
      "cycles.structure.orphan-content",
      input.sourcePath,
      "Root content must belong to an H2 Cycle record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(orphan, "start"),
    ));
  }

  const accepted: TrailCycle[] = [];
  for (const record of region.records) {
    if (!validateRecordEnvelope(record, {
      bodyStartOffset: frontmatter.bodyStartOffset,
      codePrefix: "cycles.record",
      entityKind: "cycle",
      label: "Cycle",
      sourcePath: input.sourcePath,
    }, issues)) continue;

    const label = normalizeTrailTitle(record.title);
    if (!isTrailTitle(label)) continue;
    const parsed = parseJsonObject(record.markerJson!, "Cycle data marker");
    if (parsed.value === undefined) {
      issues.push(entityCodecIssue("cycles.record.metadata-invalid", input.sourcePath, "cycle", parsed.issues.join("; "), { offset: markerOffset(record, frontmatter.bodyStartOffset) }));
      continue;
    }
    const fieldIssues: string[] = [];
    rejectUnknownKeys(parsed.value, TRAIL_PHYSICAL_RECORD_SCHEMAS.cycle.metadataOrder, "Cycle", fieldIssues);
    const id = parseRequiredId(parsed.value, "id", fieldIssues);
    const startedAt = parseRequiredTimestamp(parsed.value, "startedAt", fieldIssues);
    const plannedEnd = parseRequiredTimestamp(parsed.value, "plannedEnd", fieldIssues);
    const endedAt = parseOptionalTimestamp(parsed.value, "endedAt", fieldIssues);
    const issueIds = parseIdSet(parsed.value.issueIds, "issueIds", fieldIssues);
    const markerEnd = requiredMarkdownOffset(record.immediateMarker!, "end");
    if (normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)) !== undefined) {
      fieldIssues.push("Cycle record must not contain a description body");
    }
    if (id === undefined || startedAt === undefined || plannedEnd === undefined || fieldIssues.length > 0) {
      for (const message of fieldIssues) {
        issues.push(entityCodecIssue("cycles.record.metadata-invalid", input.sourcePath, "cycle", message, {
          entityId: id,
          offset: markerOffset(record, frontmatter.bodyStartOffset),
        }));
      }
      continue;
    }

    const cycle: TrailCycle = { endedAt, id, issueIds, plannedEnd, startedAt };
    const domainIssues = validateTrailCycle(cycle);
    if (domainIssues.length > 0) {
      for (const domainIssue of domainIssues) {
        issues.push(entityCodecIssue(`cycles.record.domain.${domainIssue.code}`, input.sourcePath, "cycle", domainIssue.message, {
          entityId: cycle.id,
          field: domainIssue.field,
          stage: "domain",
        }));
      }
      continue;
    }
    accepted.push(cycle);
  }

  const counts = new Map<string, number>();
  for (const cycle of accepted) counts.set(cycle.id, (counts.get(cycle.id) ?? 0) + 1);
  const duplicateIds = new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
  for (const id of duplicateIds) {
    issues.push(entityCodecIssue("cycles.record.id-duplicate", input.sourcePath, "cycle", `Duplicate Cycle ID: ${id}`, { entityId: id }));
  }

  return {
    document: {
      cycles: accepted.filter((cycle) => !duplicateIds.has(cycle.id)),
      sourcePath: input.sourcePath,
    },
    issues,
  };
}

export function serializeCycleRecord(cycle: TrailCycle, formatLabel: TrailCycleLabelFormatter): string {
  const validation = validateTrailCycle(cycle);
  if (validation.length > 0) throw new Error(`Cannot serialize invalid Cycle: ${validation.map((item) => item.message).join("; ")}`);
  const label = normalizeTrailTitle(formatLabel(cycle));
  if (!isTrailTitle(label)) throw new Error("Cycle label formatter returned an invalid H2 label");
  return [
    `## ${label}`,
    serializeDataMarker(TRAIL_PHYSICAL_RECORD_SCHEMAS.cycle.metadataOrder, {
      id: cycle.id,
      startedAt: cycle.startedAt,
      plannedEnd: cycle.plannedEnd,
      endedAt: cycle.endedAt,
      issueIds: canonicalIdSet(cycle.issueIds),
    }),
  ].join("\n");
}

export function serializeCyclesMarkdown(
  cycles: readonly TrailCycle[],
  formatLabel: TrailCycleLabelFormatter,
): string {
  return [
    "---",
    `kind: ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.cycles.frontmatterKind}`,
    "---",
    "",
    `# ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.cycles.rootSections[0]}`,
    ...cycles.flatMap((cycle) => ["", serializeCycleRecord(cycle, formatLabel)]),
    "",
  ].join("\n");
}
