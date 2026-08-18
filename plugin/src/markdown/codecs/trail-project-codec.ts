import type {
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  validateTrailIssue,
  validateTrailMilestone,
  validateTrailProject,
} from "../../domain/validation/trail-record-validation";
import { normalizeTrailTitle } from "../../domain/validation/trail-value-validation";
import {
  collectMarkdownH2Records,
  isMarkdownHeading,
  markdownHeadingText,
  normalizeMarkdownRecordBody,
  parseMarkdownBody,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
  type TrailMarkdownRootChild,
  type TrailRecordSourceRange,
} from "../core/trail-markdown-core";
import {
  TRAIL_PHYSICAL_RECORD_SCHEMAS,
  TRAIL_PHYSICAL_SOURCE_SCHEMAS,
} from "../schema/trail-physical-schema";
import {
  assertTrailManagedRecordBody,
  canonicalIdSet,
  canonicalWorkflowIssueMetadata,
  entityCodecIssue,
  markerOffset,
  parseExactFrontmatter,
  parseIdSet,
  parseJsonObject,
  parseOptionalId,
  parseOptionalPriority,
  parseOptionalTimestamp,
  parseRequiredId,
  parseWorkflowIssueMetadata,
  rejectUnknownKeys,
  serializeDataMarker,
  sourceCodecIssue,
  validateRecordEnvelope,
  type TrailCodecIssue,
  type TrailYamlParser,
} from "./trail-codec-support";

export interface TrailProjectSourceDocument {
  readonly issues: readonly TrailWorkflowIssue[];
  readonly locationsByIssueId: Readonly<Record<string, TrailRecordSourceRange>>;
  readonly locationsByMilestoneId: Readonly<Record<string, TrailRecordSourceRange>>;
  readonly milestones: readonly TrailMilestone[];
  readonly project: TrailProject;
  readonly projectLocation: TrailRecordSourceRange;
  readonly sourcePath: string;
}

export interface TrailProjectParseResult {
  readonly document?: TrailProjectSourceDocument;
  readonly issues: readonly TrailCodecIssue[];
}

interface ParsedRecord<T> {
  readonly entity: T;
  readonly source: TrailRecordSourceRange;
}

function parseProjectMetadata(
  raw: string,
  id: string,
  title: string,
  description: string | undefined,
): { readonly issues: readonly string[]; readonly project?: TrailProject } {
  const parsed = parseJsonObject(raw, "Project data marker");
  if (parsed.value === undefined) return { issues: parsed.issues };
  const issues: string[] = [];
  rejectUnknownKeys(parsed.value, TRAIL_PHYSICAL_RECORD_SCHEMAS.project.metadataOrder, "Project", issues);
  const statusDefinitionId = parseRequiredId(parsed.value, "statusDefinitionId", issues);
  const initiativeId = parseOptionalId(parsed.value, "initiativeId", issues);
  const priority = parseOptionalPriority(parsed.value, "priority", issues);
  const due = parseOptionalTimestamp(parsed.value, "due", issues);
  const labelIds = parseIdSet(parsed.value.labelIds, "labelIds", issues);
  if (statusDefinitionId === undefined || issues.length > 0) return { issues };
  return {
    issues,
    project: {
      description,
      due,
      id,
      initiativeId,
      labelIds,
      priority,
      statusDefinitionId,
      title,
    },
  };
}

function parseMilestoneMetadata(
  raw: string,
  ownerProjectId: string,
): { readonly issues: readonly string[]; readonly milestone?: Omit<TrailMilestone, "description" | "title"> } {
  const parsed = parseJsonObject(raw, "Milestone data marker");
  if (parsed.value === undefined) return { issues: parsed.issues };
  const issues: string[] = [];
  rejectUnknownKeys(parsed.value, TRAIL_PHYSICAL_RECORD_SCHEMAS.milestone.metadataOrder, "Milestone", issues);
  const id = parseRequiredId(parsed.value, "id", issues);
  const projectId = parseRequiredId(parsed.value, "projectId", issues);
  const due = parseOptionalTimestamp(parsed.value, "due", issues);
  if (projectId !== undefined && projectId !== ownerProjectId) {
    issues.push("projectId must match the owning Project file");
  }
  if (id === undefined || projectId === undefined || issues.length > 0) return { issues };
  return { issues, milestone: { due, id, projectId } };
}

function recordSource(
  sourcePath: string,
  bodyStartOffset: number,
  record: Parameters<typeof markerOffset>[0],
): TrailRecordSourceRange {
  const marker = record.immediateMarker!;
  return {
    endOffset: bodyStartOffset + record.endOffset,
    filePath: sourcePath,
    markerEndOffset: bodyStartOffset + requiredMarkdownOffset(marker, "end"),
    markerStartOffset: bodyStartOffset + requiredMarkdownOffset(marker, "start"),
    startOffset: bodyStartOffset + record.startOffset,
  };
}

function rejectDuplicates<T extends { readonly id: string }>(
  records: readonly ParsedRecord<T>[],
  input: {
    readonly code: string;
    readonly entityKind: "issue" | "milestone";
    readonly label: string;
    readonly sourcePath: string;
  },
  issues: TrailCodecIssue[],
): readonly ParsedRecord<T>[] {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.entity.id, (counts.get(record.entity.id) ?? 0) + 1);
  const duplicateIds = new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
  for (const id of duplicateIds) {
    issues.push(entityCodecIssue(input.code, input.sourcePath, input.entityKind, `Duplicate ${input.label} ID: ${id}`, { entityId: id }));
  }
  return records.filter(({ entity }) => !duplicateIds.has(entity.id));
}

function rootHeadings(children: readonly TrailMarkdownRootChild[]) {
  return children
    .map((node, index) => ({ index, node }))
    .filter((entry): entry is { readonly index: number; readonly node: Extract<TrailMarkdownRootChild, { type: "heading" }> } =>
      isMarkdownHeading(entry.node, 1));
}

export function parseProjectMarkdown(input: {
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
  readonly sourcePath: string;
}): TrailProjectParseResult {
  const issues: TrailCodecIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return { issues: [sourceCodecIssue("project.frontmatter.missing", input.sourcePath, "Project file requires frontmatter")] };
  }
  const frontmatterIssues = parseExactFrontmatter(frontmatter.yaml, input.parseYaml, {
    kind: TRAIL_PHYSICAL_SOURCE_SCHEMAS.project.frontmatterKind,
    id: "<id>",
  });
  if (frontmatterIssues.length > 0) {
    return { issues: [sourceCodecIssue("project.frontmatter.invalid", input.sourcePath, frontmatterIssues.join("; "), undefined, "field")] };
  }
  const parsedYaml = input.parseYaml(frontmatter.yaml) as Record<string, unknown>;
  const projectId = parsedYaml.id as string;

  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  const h1 = rootHeadings(children);
  const expected = TRAIL_PHYSICAL_SOURCE_SCHEMAS.project.rootSections;
  if (
    h1.length !== expected.length
    || h1.map(({ node }) => markdownHeadingText(node)).some((value, index) => value !== expected[index])
    || h1[0].index !== 0
  ) {
    return { issues: [sourceCodecIssue("project.structure.invalid", input.sourcePath, "Project file requires exactly # Project, # Milestones, and # Issues in order")] };
  }

  const projectRegion = collectMarkdownH2Records(body, children, h1[0].index + 1, h1[1].index);
  if (projectRegion.records.length !== 1 || projectRegion.orphanNodes.length > 0) {
    return { issues: [sourceCodecIssue("project.record.invalid", input.sourcePath, "# Project must contain exactly one H2 Project record")] };
  }
  const projectRecord = projectRegion.records[0];
  if (!validateRecordEnvelope(projectRecord, {
    bodyStartOffset: frontmatter.bodyStartOffset,
    codePrefix: "project.record",
    entityKind: "project",
    label: "Project",
    sourcePath: input.sourcePath,
  }, issues)) return { issues };

  const projectMarkerEnd = requiredMarkdownOffset(projectRecord.immediateMarker!, "end");
  const parsedProject = parseProjectMetadata(
    projectRecord.markerJson!,
    projectId,
    normalizeTrailTitle(projectRecord.title),
    normalizeMarkdownRecordBody(body.slice(projectMarkerEnd, projectRecord.endOffset)),
  );
  for (const message of parsedProject.issues) {
    issues.push(entityCodecIssue("project.record.metadata-invalid", input.sourcePath, "project", message, {
      entityId: projectId,
      offset: markerOffset(projectRecord, frontmatter.bodyStartOffset),
    }));
  }
  if (parsedProject.project === undefined) return { issues };
  const projectValidation = validateTrailProject(parsedProject.project);
  if (projectValidation.length > 0) {
    for (const domainIssue of projectValidation) {
      issues.push(entityCodecIssue(`project.record.domain.${domainIssue.code}`, input.sourcePath, "project", domainIssue.message, {
        entityId: projectId,
        field: domainIssue.field,
        stage: "domain",
      }));
    }
    return { issues };
  }

  const milestoneRegion = collectMarkdownH2Records(body, children, h1[1].index + 1, h1[2].index);
  for (const orphan of milestoneRegion.orphanNodes) {
    issues.push(sourceCodecIssue(
      "project.milestones.orphan-content",
      input.sourcePath,
      "Root content under # Milestones must belong to an H2 Milestone record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(orphan, "start"),
    ));
  }
  const parsedMilestones: ParsedRecord<TrailMilestone>[] = [];
  for (const record of milestoneRegion.records) {
    if (!validateRecordEnvelope(record, {
      bodyStartOffset: frontmatter.bodyStartOffset,
      codePrefix: "project.milestone",
      entityKind: "milestone",
      label: "Milestone",
      sourcePath: input.sourcePath,
    }, issues)) continue;
    const parsed = parseMilestoneMetadata(record.markerJson!, projectId);
    const entityId = parsed.milestone?.id;
    for (const message of parsed.issues) {
      issues.push(entityCodecIssue("project.milestone.metadata-invalid", input.sourcePath, "milestone", message, {
        entityId,
        offset: markerOffset(record, frontmatter.bodyStartOffset),
      }));
    }
    if (parsed.milestone === undefined || parsed.issues.length > 0) continue;
    const markerEnd = requiredMarkdownOffset(record.immediateMarker!, "end");
    const milestone: TrailMilestone = {
      ...parsed.milestone,
      description: normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)),
      title: normalizeTrailTitle(record.title),
    };
    const validation = validateTrailMilestone(milestone);
    if (validation.length > 0) {
      for (const domainIssue of validation) {
        issues.push(entityCodecIssue(`project.milestone.domain.${domainIssue.code}`, input.sourcePath, "milestone", domainIssue.message, {
          entityId: milestone.id,
          field: domainIssue.field,
          stage: "domain",
        }));
      }
      continue;
    }
    parsedMilestones.push({ entity: milestone, source: recordSource(input.sourcePath, frontmatter.bodyStartOffset, record) });
  }
  const milestones = rejectDuplicates(parsedMilestones, {
    code: "project.milestone.id-duplicate",
    entityKind: "milestone",
    label: "Milestone",
    sourcePath: input.sourcePath,
  }, issues);

  const issueRegion = collectMarkdownH2Records(body, children, h1[2].index + 1);
  for (const orphan of issueRegion.orphanNodes) {
    issues.push(sourceCodecIssue(
      "project.issues.orphan-content",
      input.sourcePath,
      "Root content under # Issues must belong to an H2 Issue record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(orphan, "start"),
    ));
  }
  const parsedIssues: ParsedRecord<TrailWorkflowIssue>[] = [];
  for (const record of issueRegion.records) {
    if (!validateRecordEnvelope(record, {
      bodyStartOffset: frontmatter.bodyStartOffset,
      codePrefix: "project.issue",
      entityKind: "issue",
      label: "Workflow Issue",
      sourcePath: input.sourcePath,
    }, issues)) continue;
    const parsed = parseWorkflowIssueMetadata(record.markerJson!, { kind: "project", projectId });
    const entityId = parsed.issue?.id;
    for (const message of parsed.issues) {
      issues.push(entityCodecIssue("project.issue.metadata-invalid", input.sourcePath, "issue", message, {
        entityId,
        offset: markerOffset(record, frontmatter.bodyStartOffset),
      }));
    }
    if (parsed.issue === undefined || parsed.issues.length > 0) continue;
    const markerEnd = requiredMarkdownOffset(record.immediateMarker!, "end");
    const issue: TrailWorkflowIssue = {
      ...parsed.issue,
      description: normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)),
      title: normalizeTrailTitle(record.title),
    };
    const validation = validateTrailIssue(issue);
    if (validation.length > 0) {
      for (const domainIssue of validation) {
        issues.push(entityCodecIssue(`project.issue.domain.${domainIssue.code}`, input.sourcePath, "issue", domainIssue.message, {
          entityId: issue.id,
          field: domainIssue.field,
          stage: "domain",
        }));
      }
      continue;
    }
    parsedIssues.push({ entity: issue, source: recordSource(input.sourcePath, frontmatter.bodyStartOffset, record) });
  }
  const workflowIssues = rejectDuplicates(parsedIssues, {
    code: "project.issue.id-duplicate",
    entityKind: "issue",
    label: "Workflow Issue",
    sourcePath: input.sourcePath,
  }, issues);

  return {
    document: {
      issues: workflowIssues.map(({ entity }) => entity),
      locationsByIssueId: Object.fromEntries(workflowIssues.map(({ entity, source }) => [entity.id, source])),
      locationsByMilestoneId: Object.fromEntries(milestones.map(({ entity, source }) => [entity.id, source])),
      milestones: milestones.map(({ entity }) => entity),
      project: parsedProject.project,
      projectLocation: recordSource(input.sourcePath, frontmatter.bodyStartOffset, projectRecord),
      sourcePath: input.sourcePath,
    },
    issues,
  };
}

export function serializeProjectMilestone(milestone: TrailMilestone, projectId: string): string {
  const validation = validateTrailMilestone(milestone);
  if (validation.length > 0 || milestone.projectId !== projectId) {
    throw new Error("Cannot serialize invalid Project Milestone");
  }
  const lines = [
    `## ${normalizeTrailTitle(milestone.title)}`,
    serializeDataMarker(TRAIL_PHYSICAL_RECORD_SCHEMAS.milestone.metadataOrder, {
      id: milestone.id,
      projectId: milestone.projectId,
      due: milestone.due,
    }),
  ];
  const description = milestone.description === undefined ? undefined : normalizeMarkdownRecordBody(milestone.description);
  if (description !== undefined) lines.push("", description);
  return lines.join("\n");
}

export function serializeProjectWorkflowIssue(issue: TrailWorkflowIssue, projectId: string): string {
  const validation = validateTrailIssue(issue);
  if (validation.length > 0 || issue.projectId !== projectId) {
    throw new Error("Cannot serialize invalid Project Workflow Issue");
  }
  const lines = [
    `## ${normalizeTrailTitle(issue.title)}`,
    serializeDataMarker(TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder, canonicalWorkflowIssueMetadata(issue)),
  ];
  const description = issue.description === undefined ? undefined : normalizeMarkdownRecordBody(issue.description);
  if (description !== undefined) lines.push("", description);
  return lines.join("\n");
}

export function serializeProjectRecord(project: TrailProject): string {
  const validation = validateTrailProject(project);
  if (validation.length > 0) {
    throw new Error(`Cannot serialize invalid Project: ${validation.map((item) => item.message).join("; ")}`);
  }
  assertTrailManagedRecordBody(project.description, "Project");
  const lines = [
    `## ${normalizeTrailTitle(project.title)}`,
    serializeDataMarker(TRAIL_PHYSICAL_RECORD_SCHEMAS.project.metadataOrder, {
      statusDefinitionId: project.statusDefinitionId,
      initiativeId: project.initiativeId,
      priority: project.priority,
      due: project.due,
      labelIds: canonicalIdSet(project.labelIds),
    }),
  ];
  const description = project.description === undefined
    ? undefined
    : normalizeMarkdownRecordBody(project.description);
  if (description !== undefined) lines.push("", description);
  return lines.join("\n");
}

export function serializeProjectMarkdown(input: {
  readonly issues: readonly TrailWorkflowIssue[];
  readonly milestones: readonly TrailMilestone[];
  readonly project: TrailProject;
}): string {
  const lines = [
    "---",
    `kind: ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.project.frontmatterKind}`,
    `id: ${JSON.stringify(input.project.id)}`,
    "---",
    "",
    `# ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.project.rootSections[0]}`,
    "",
    serializeProjectRecord(input.project),
  ];
  lines.push("", `# ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.project.rootSections[1]}`);
  for (const milestone of input.milestones) lines.push("", serializeProjectMilestone(milestone, input.project.id));
  lines.push("", `# ${TRAIL_PHYSICAL_SOURCE_SCHEMAS.project.rootSections[2]}`);
  for (const issue of input.issues) lines.push("", serializeProjectWorkflowIssue(issue, input.project.id));
  lines.push("");
  return lines.join("\n");
}
