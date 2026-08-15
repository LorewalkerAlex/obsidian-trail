import {
  isTrailEpochMilliseconds,
  isTrailPriority,
  isValidTrailTitle,
  normalizeTrailTitle,
  sameTrailWorkflowIssue,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import {
  validateTrailProjectFields,
  type TrailProject,
} from "../../domain/trail-project";
import {
  appendMarkdownBlock,
  collectMarkdownH2Records,
  isMarkdownDataMarker,
  isMarkdownHeading,
  isRecordObject,
  markdownDataMarkerJson,
  markdownHeadingText,
  normalizeMarkdownRecordBody,
  parseMarkdownBody,
  removeMarkdownRange,
  replaceMarkdownHeadingAndMarker,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
  type TrailMarkdownRecordSlice,
  type TrailRecordSourceRange,
  type TrailMarkdownRootChild,
} from "../core/trail-markdown-core";
import { TRAIL_PHYSICAL_RECORD_SCHEMAS } from "../schema/trail-physical-schema";
import {
  canonicalWorkflowIssueMetadata,
  fileCodecIssue,
  parseIdSet,
  parseOptionalEpoch,
  parseOptionalString,
  parseRequiredString,
  parseWorkflowIssueMetadata,
  recordCodecIssue,
  type TrailCodecIssue,
  type TrailYamlParser,
} from "./trail-codec-support";

export type TrailProjectParseIssue = TrailCodecIssue;

export interface TrailPhysicalMilestoneRecord {
  readonly description?: string;
  readonly due?: number;
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
}

export interface TrailProjectContribution {
  readonly filePath: string;
  readonly issuesById: Readonly<Record<string, TrailWorkflowIssue>>;
  readonly project: TrailProject;
  readonly sourceByIssueId: Readonly<Record<string, TrailRecordSourceRange>>;
}

export interface TrailProjectParseResult {
  readonly contribution?: TrailProjectContribution;
  readonly issues: readonly TrailProjectParseIssue[];
  /** Physical Milestone records are parsed now, without exposing Milestone behavior. */
  readonly physicalMilestonesById?: Readonly<Record<string, TrailPhysicalMilestoneRecord>>;
}

export interface ParseProjectMarkdownInput {
  readonly filePath: string;
  readonly markdown: string;
  readonly parseYaml: TrailYamlParser;
}

export type ProjectMarkdownMutationErrorCode =
  | "conflict"
  | "duplicate-id"
  | "source-invalid"
  | "target-missing"
  | "verification-failed";

export class ProjectMarkdownMutationError extends Error {
  public constructor(
    readonly code: ProjectMarkdownMutationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectMarkdownMutationError";
  }
}

interface IssueCandidate {
  readonly issue: TrailWorkflowIssue;
  readonly source: TrailRecordSourceRange;
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

function parseFrontmatterIdentity(
  input: ParseProjectMarkdownInput,
  yaml: string,
  issues: TrailProjectParseIssue[],
): string | undefined {
  let value: unknown;
  try {
    value = input.parseYaml(yaml);
  } catch {
    value = undefined;
  }
  if (
    !isRecordObject(value)
    || Object.keys(value).some((key) => key !== "kind" && key !== "id")
    || Object.keys(value).length !== 2
    || value.kind !== "project"
    || typeof value.id !== "string"
    || value.id.trim() === ""
  ) {
    issues.push(fileCodecIssue(
      "project.frontmatter.invalid",
      input.filePath,
      "Project frontmatter must contain exactly kind: project and a non-empty id",
    ));
    return undefined;
  }
  return value.id;
}

function parseProjectMetadata(
  raw: string,
  id: string,
  title: string,
  description: string | undefined,
): { readonly project?: TrailProject; readonly issues: string[] } {
  const parsed = parseJsonObject(raw, "Project data marker");
  if (parsed.value === undefined) {
    return { issues: parsed.issues };
  }
  const value = parsed.value;
  const issues = [...parsed.issues];
  rejectUnknownMetadata(
    value,
    TRAIL_PHYSICAL_RECORD_SCHEMAS.project.metadataOrder,
    "Project",
    issues,
  );

  const statusDefinitionId = parseRequiredString(
    value,
    "statusDefinitionId",
    issues,
  );
  const initiativeId = parseOptionalString(value, "initiativeId", issues);
  let priority: TrailProject["priority"];
  if (value.priority !== undefined) {
    if (!isTrailPriority(value.priority)) {
      issues.push("priority must be urgent, high, medium, or low");
    } else {
      priority = value.priority;
    }
  }
  const due = parseOptionalEpoch(value, "due", issues);
  const labelIds = parseIdSet(value.labelIds, "labelIds", issues);
  if (statusDefinitionId === undefined || issues.length > 0) {
    return { issues };
  }

  const project: TrailProject = {
    description,
    due,
    id,
    initiativeId,
    labelIds,
    priority,
    statusDefinitionId,
    title,
  };
  issues.push(...validateTrailProjectFields(project));
  return issues.length > 0 ? { issues } : { project, issues };
}

function parseMilestoneMetadata(
  raw: string,
  ownerProjectId: string,
): { readonly milestone?: Omit<TrailPhysicalMilestoneRecord, "description" | "title">; readonly issues: string[] } {
  const parsed = parseJsonObject(raw, "Milestone data marker");
  if (parsed.value === undefined) {
    return { issues: parsed.issues };
  }
  const value = parsed.value;
  const issues = [...parsed.issues];
  rejectUnknownMetadata(
    value,
    TRAIL_PHYSICAL_RECORD_SCHEMAS.milestone.metadataOrder,
    "Milestone",
    issues,
  );
  const id = parseRequiredString(value, "id", issues);
  const projectId = parseRequiredString(value, "projectId", issues);
  if (projectId !== undefined && projectId !== ownerProjectId) {
    issues.push("projectId must match the owning Project file");
  }
  const due = parseOptionalEpoch(value, "due", issues);
  if (id === undefined || projectId === undefined || issues.length > 0) {
    return { issues };
  }
  return { issues, milestone: { due, id, projectId } };
}

function validateRecordMarker(
  record: TrailMarkdownRecordSlice,
  input: {
    readonly filePath: string;
    readonly bodyStartOffset: number;
    readonly codePrefix: string;
    readonly label: string;
  },
  issues: TrailProjectParseIssue[],
): boolean {
  const offset = input.bodyStartOffset + record.startOffset;
  if (!isValidTrailTitle(normalizeTrailTitle(record.title))) {
    issues.push(recordCodecIssue(
      `${input.codePrefix}.title-invalid`,
      input.filePath,
      `${input.label} title must be non-empty single-line text`,
      undefined,
      offset,
    ));
  }
  if (record.markerJson === null || record.immediateMarker === undefined) {
    issues.push(recordCodecIssue(
      `${input.codePrefix}.marker-position`,
      input.filePath,
      `${input.label} metadata marker must immediately follow its H2`,
      undefined,
      offset,
    ));
  }
  if (record.markerCount !== 1) {
    issues.push(recordCodecIssue(
      `${input.codePrefix}.marker-count`,
      input.filePath,
      `${input.label} record requires exactly one metadata marker`,
      undefined,
      offset,
    ));
  }
  return (
    isValidTrailTitle(normalizeTrailTitle(record.title))
    && record.markerJson !== null
    && record.immediateMarker !== undefined
    && record.markerCount === 1
  );
}

function parseMilestoneRegion(
  filePath: string,
  projectId: string,
  body: string,
  bodyStartOffset: number,
  children: readonly TrailMarkdownRootChild[],
  startIndex: number,
  endIndex: number,
  issues: TrailProjectParseIssue[],
): Readonly<Record<string, TrailPhysicalMilestoneRecord>> {
  const region = collectMarkdownH2Records(body, children, startIndex, endIndex);
  for (const orphan of region.orphanNodes) {
    issues.push(fileCodecIssue(
      "project.milestones.orphan-content",
      filePath,
      "Root content under # Milestones must belong to an H2 Milestone record",
      bodyStartOffset + requiredMarkdownOffset(orphan, "start"),
    ));
  }

  const candidates: TrailPhysicalMilestoneRecord[] = [];
  for (const record of region.records) {
    if (!validateRecordMarker(record, {
      bodyStartOffset,
      codePrefix: "project.milestone",
      filePath,
      label: "Milestone",
    }, issues)) {
      continue;
    }
    if (record.markerJson === null || record.immediateMarker === undefined) {
      continue;
    }
    const metadata = parseMilestoneMetadata(record.markerJson, projectId);
    const objectId = metadata.milestone?.id;
    const markerStart = requiredMarkdownOffset(record.immediateMarker, "start");
    metadata.issues.forEach((message) => {
      issues.push(recordCodecIssue(
        "project.milestone.metadata-invalid",
        filePath,
        message,
        objectId,
        bodyStartOffset + markerStart,
      ));
    });
    if (metadata.milestone === undefined || metadata.issues.length > 0) {
      continue;
    }
    const markerEnd = requiredMarkdownOffset(record.immediateMarker, "end");
    candidates.push({
      ...metadata.milestone,
      description: normalizeMarkdownRecordBody(body.slice(markerEnd, record.endOffset)),
      title: normalizeTrailTitle(record.title),
    });
  }

  const counts = new Map<string, number>();
  candidates.forEach((milestone) => {
    counts.set(milestone.id, (counts.get(milestone.id) ?? 0) + 1);
  });
  const duplicateIds = new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );
  for (const id of duplicateIds) {
    issues.push(recordCodecIssue(
      "project.milestone.id-duplicate",
      filePath,
      `Duplicate Milestone ID: ${id}`,
      id,
    ));
  }

  return Object.fromEntries(
    candidates
      .filter((milestone) => !duplicateIds.has(milestone.id))
      .map((milestone) => [milestone.id, milestone]),
  );
}

export function parseProjectMarkdown(
  input: ParseProjectMarkdownInput,
): TrailProjectParseResult {
  const issues: TrailProjectParseIssue[] = [];
  const frontmatter = splitMarkdownFrontmatter(input.markdown);
  if (frontmatter === null) {
    return {
      issues: [fileCodecIssue(
        "project.frontmatter.missing",
        input.filePath,
        "Project file requires a frontmatter block",
      )],
    };
  }

  const projectId = parseFrontmatterIdentity(input, frontmatter.yaml, issues);
  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = parseMarkdownBody(body).children;
  const h1Entries = children
    .map((node, index) => ({ index, node }))
    .filter((entry): entry is { readonly index: number; readonly node: Extract<TrailMarkdownRootChild, { type: "heading" }> } =>
      isMarkdownHeading(entry.node, 1));
  const expectedH1 = ["Project", "Milestones", "Issues"];
  const actualH1 = h1Entries.map(({ node }) => markdownHeadingText(node));
  if (
    h1Entries.length !== expectedH1.length
    || actualH1.some((heading, index) => heading !== expectedH1[index])
  ) {
    issues.push(fileCodecIssue(
      "project.structure.sections",
      input.filePath,
      "Project file requires exactly # Project, # Milestones, and # Issues in order",
    ));
    return { issues };
  }

  const projectH1 = h1Entries[0];
  const milestonesH1 = h1Entries[1];
  const issuesH1 = h1Entries[2];
  if (projectH1.index !== 0) {
    issues.push(fileCodecIssue(
      "project.structure.orphan-before-project",
      input.filePath,
      "No root content may appear before # Project",
    ));
  }

  const projectRegion = children.slice(projectH1.index + 1, milestonesH1.index);
  const projectHeading = projectRegion[0];
  if (!projectHeading || !isMarkdownHeading(projectHeading, 2)) {
    issues.push(fileCodecIssue(
      "project.record.missing",
      input.filePath,
      "# Project must contain exactly one H2 Project record",
    ));
    return { issues };
  }
  if (projectRegion.filter((node) => isMarkdownHeading(node, 2)).length !== 1) {
    issues.push(fileCodecIssue(
      "project.record.count",
      input.filePath,
      "# Project must contain exactly one H2 Project record",
    ));
  }

  const projectMarker = projectRegion[1];
  const projectMarkers = projectRegion.slice(1).filter(isMarkdownDataMarker);
  const projectJson = markdownDataMarkerJson(projectMarker);
  const projectTitle = normalizeTrailTitle(markdownHeadingText(projectHeading));
  if (!isValidTrailTitle(projectTitle)) {
    issues.push(recordCodecIssue(
      "project.record.title-invalid",
      input.filePath,
      "Project title must be non-empty single-line text",
      projectId,
      frontmatter.bodyStartOffset + requiredMarkdownOffset(projectHeading, "start"),
    ));
  }
  if (projectJson === null) {
    issues.push(recordCodecIssue(
      "project.record.marker-position",
      input.filePath,
      "Project metadata marker must immediately follow the Project H2",
      projectId,
    ));
  }
  if (projectMarkers.length !== 1) {
    issues.push(recordCodecIssue(
      "project.record.marker-count",
      input.filePath,
      "Project record requires exactly one metadata marker",
      projectId,
    ));
  }

  if (
    projectId === undefined
    || projectJson === null
    || projectMarkers.length !== 1
    || !isValidTrailTitle(projectTitle)
  ) {
    return { issues };
  }

  const projectMarkerEnd = requiredMarkdownOffset(projectMarker, "end");
  const projectDescription = normalizeMarkdownRecordBody(body.slice(
    projectMarkerEnd,
    requiredMarkdownOffset(milestonesH1.node, "start"),
  ));
  const parsedProject = parseProjectMetadata(
    projectJson,
    projectId,
    projectTitle,
    projectDescription,
  );
  parsedProject.issues.forEach((message) => {
    issues.push(recordCodecIssue(
      "project.record.metadata-invalid",
      input.filePath,
      message,
      projectId,
      frontmatter.bodyStartOffset + requiredMarkdownOffset(projectMarker, "start"),
    ));
  });
  if (parsedProject.project === undefined) {
    return { issues };
  }

  const physicalMilestonesById = parseMilestoneRegion(
    input.filePath,
    projectId,
    body,
    frontmatter.bodyStartOffset,
    children,
    milestonesH1.index + 1,
    issuesH1.index,
    issues,
  );

  const issueRegion = collectMarkdownH2Records(body, children, issuesH1.index + 1);
  for (const orphan of issueRegion.orphanNodes) {
    issues.push(fileCodecIssue(
      "project.issues.orphan-content",
      input.filePath,
      "Root content under # Issues must belong to an H2 Issue record",
      frontmatter.bodyStartOffset + requiredMarkdownOffset(orphan, "start"),
    ));
  }

  const candidates: IssueCandidate[] = [];
  for (const record of issueRegion.records) {
    const title = normalizeTrailTitle(record.title);
    const recordOffset = frontmatter.bodyStartOffset + record.startOffset;
    if (!isValidTrailTitle(title)) {
      issues.push(recordCodecIssue(
        "project.issue.title-invalid",
        input.filePath,
        "Workflow Issue title must be non-empty single-line text",
        undefined,
        recordOffset,
      ));
    }
    if (record.markerJson === null || record.immediateMarker === undefined) {
      issues.push(recordCodecIssue(
        "project.issue.marker-position",
        input.filePath,
        `Metadata marker must immediately follow H2: ${title}`,
        undefined,
        recordOffset,
      ));
    }
    if (record.markerCount !== 1) {
      issues.push(recordCodecIssue(
        "project.issue.marker-count",
        input.filePath,
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

    const metadata = parseWorkflowIssueMetadata(
      record.markerJson,
      { kind: "project", projectId },
    );
    const objectId = metadata.issue?.id;
    const markerStart = requiredMarkdownOffset(record.immediateMarker, "start");
    metadata.issues.forEach((message) => {
      issues.push(recordCodecIssue(
        "project.issue.metadata-invalid",
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
  candidates.forEach((candidate) => {
    counts.set(candidate.issue.id, (counts.get(candidate.issue.id) ?? 0) + 1);
  });
  const duplicateIds = new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );
  for (const id of duplicateIds) {
    issues.push(recordCodecIssue(
      "project.issue.id-duplicate",
      input.filePath,
      `Duplicate Workflow Issue ID: ${id}`,
      id,
    ));
  }

  const issuesById: Record<string, TrailWorkflowIssue> = {};
  const sourceByIssueId: Record<string, TrailRecordSourceRange> = {};
  candidates
    .filter((candidate) => !duplicateIds.has(candidate.issue.id))
    .forEach((candidate) => {
      issuesById[candidate.issue.id] = candidate.issue;
      sourceByIssueId[candidate.issue.id] = candidate.source;
    });

  return {
    contribution: {
      filePath: input.filePath,
      issuesById,
      project: parsedProject.project,
      sourceByIssueId,
    },
    issues,
    physicalMilestonesById,
  };
}

function canonicalProjectMetadata(project: TrailProject): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    statusDefinitionId: project.statusDefinitionId,
  };
  if (project.initiativeId !== undefined) metadata.initiativeId = project.initiativeId;
  if (project.priority !== undefined) metadata.priority = project.priority;
  if (project.due !== undefined) metadata.due = project.due;
  if (project.labelIds.length > 0) metadata.labelIds = [...project.labelIds].sort();
  return metadata;
}

export function serializeWorkflowIssue(issue: TrailWorkflowIssue): string {
  if (!isValidTrailTitle(issue.title)) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Cannot serialize an invalid Workflow Issue title",
    );
  }
  if (issue.id.trim() === "" || issue.statusDefinitionId.trim() === "") {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Cannot serialize Workflow Issue with missing identity or status",
    );
  }
  if (!isTrailEpochMilliseconds(issue.createdAt)) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Cannot serialize Workflow Issue with invalid createdAt",
    );
  }
  if (issue.projectId === undefined || issue.projectId.trim() === "") {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Project-owned Workflow Issue requires projectId",
    );
  }
  const lines = [
    `## ${normalizeTrailTitle(issue.title)}`,
    `<!-- data ${JSON.stringify(canonicalWorkflowIssueMetadata(issue))} -->`,
  ];
  const description = issue.description === undefined
    ? undefined
    : normalizeMarkdownRecordBody(issue.description);
  if (description !== undefined) lines.push("", description);
  return lines.join("\n");
}

export function serializeProjectMarkdown(project: TrailProject): string {
  const validationIssues = validateTrailProjectFields(project);
  if (validationIssues.length > 0) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      `Cannot serialize invalid Project: ${validationIssues.join("; ")}`,
    );
  }
  const lines = [
    "---",
    "kind: project",
    `id: ${JSON.stringify(project.id)}`,
    "---",
    "",
    "# Project",
    "",
    `## ${normalizeTrailTitle(project.title)}`,
    `<!-- data ${JSON.stringify(canonicalProjectMetadata(project))} -->`,
  ];
  const description = project.description === undefined
    ? undefined
    : normalizeMarkdownRecordBody(project.description);
  if (description !== undefined) lines.push("", description);
  lines.push("", "# Milestones", "", "# Issues", "");
  return lines.join("\n");
}

interface ProjectMutationInput extends ParseProjectMarkdownInput {
  readonly expectedProject: TrailProject;
}

function requireCurrentProject(input: ProjectMutationInput): TrailProjectContribution {
  const current = parseProjectMarkdown(input);
  if (current.issues.length > 0 || current.contribution === undefined) {
    throw new ProjectMarkdownMutationError(
      "source-invalid",
      "Refused to mutate an invalid Project source",
    );
  }
  const latestProject = current.contribution.project;
  if (
    latestProject.id !== input.expectedProject.id
    || latestProject.statusDefinitionId !== input.expectedProject.statusDefinitionId
  ) {
    throw new ProjectMarkdownMutationError(
      "conflict",
      `Project changed before mutation: ${input.expectedProject.id}`,
    );
  }
  return current.contribution;
}

export function appendWorkflowIssueToProjectMarkdown(
  input: ProjectMutationInput & { readonly issue: TrailWorkflowIssue },
): string {
  const current = requireCurrentProject(input);
  if (input.issue.projectId !== input.expectedProject.id) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Workflow Issue projectId must match the target Project",
    );
  }
  if (current.issuesById[input.issue.id] !== undefined) {
    throw new ProjectMarkdownMutationError(
      "duplicate-id",
      `Workflow Issue already exists: ${input.issue.id}`,
    );
  }
  const next = appendMarkdownBlock(input.markdown, serializeWorkflowIssue(input.issue));
  const verified = parseProjectMarkdown({
    filePath: input.filePath,
    markdown: next,
    parseYaml: input.parseYaml,
  });
  const verifiedIssue = verified.contribution?.issuesById[input.issue.id];
  if (
    verified.issues.length > 0
    || verifiedIssue === undefined
    || !sameTrailWorkflowIssue(verifiedIssue, input.issue)
  ) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Generated Workflow Issue append failed verification",
    );
  }
  return next;
}

interface WorkflowIssueMutationInput extends ParseProjectMarkdownInput {
  readonly expectedIssue: TrailWorkflowIssue;
}

function requireCurrentWorkflowIssue(
  input: WorkflowIssueMutationInput,
): {
  readonly contribution: TrailProjectContribution;
  readonly issue: TrailWorkflowIssue;
  readonly source: TrailRecordSourceRange;
} {
  const current = parseProjectMarkdown(input);
  if (current.issues.length > 0 || current.contribution === undefined) {
    throw new ProjectMarkdownMutationError(
      "source-invalid",
      "Refused to mutate an invalid Project source",
    );
  }
  const issue = current.contribution.issuesById[input.expectedIssue.id];
  const source = current.contribution.sourceByIssueId[input.expectedIssue.id];
  if (issue === undefined || source === undefined) {
    throw new ProjectMarkdownMutationError(
      "target-missing",
      `Workflow Issue is missing: ${input.expectedIssue.id}`,
    );
  }
  if (!sameTrailWorkflowIssue(issue, input.expectedIssue)) {
    throw new ProjectMarkdownMutationError(
      "conflict",
      `Workflow Issue changed before mutation: ${input.expectedIssue.id}`,
    );
  }
  return { contribution: current.contribution, issue, source };
}

export function updateWorkflowIssueInProjectMarkdown(
  input: WorkflowIssueMutationInput & { readonly issue: TrailWorkflowIssue },
): string {
  if (input.issue.id !== input.expectedIssue.id) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Workflow Issue update cannot change stable identity",
    );
  }
  serializeWorkflowIssue(input.issue);
  const current = requireCurrentWorkflowIssue(input);
  if (input.issue.projectId !== current.contribution.project.id) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "In-place Workflow Issue update cannot change Project",
    );
  }
  const next = replaceMarkdownHeadingAndMarker(input.markdown, {
    heading: `## ${normalizeTrailTitle(input.issue.title)}`,
    marker: `<!-- data ${JSON.stringify(canonicalWorkflowIssueMetadata(input.issue))} -->`,
    markerEndOffset: current.source.markerEndOffset,
    markerStartOffset: current.source.markerStartOffset,
    recordStartOffset: current.source.startOffset,
  });
  const verified = parseProjectMarkdown({
    filePath: input.filePath,
    markdown: next,
    parseYaml: input.parseYaml,
  });
  const verifiedIssue = verified.contribution?.issuesById[input.issue.id];
  if (
    verified.issues.length > 0
    || verifiedIssue === undefined
    || !sameTrailWorkflowIssue(verifiedIssue, input.issue)
  ) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Generated Workflow Issue update failed verification",
    );
  }
  return next;
}

export interface DeleteWorkflowIssueFromProjectMarkdownInput
  extends ParseProjectMarkdownInput {
  readonly expectedIssue: TrailWorkflowIssue;
}

export function deleteWorkflowIssueFromProjectMarkdown(
  input: DeleteWorkflowIssueFromProjectMarkdownInput,
): string {
  const current = requireCurrentWorkflowIssue(input);
  const next = removeMarkdownRange(
    input.markdown,
    current.source.startOffset,
    current.source.endOffset,
  );
  const verified = parseProjectMarkdown({
    filePath: input.filePath,
    markdown: next,
    parseYaml: input.parseYaml,
  });
  if (
    verified.issues.length > 0
    || verified.contribution === undefined
    || verified.contribution.issuesById[input.expectedIssue.id] !== undefined
  ) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Generated Workflow Issue deletion failed verification",
    );
  }
  return next;
}

export function serializePhysicalMilestoneRecord(
  milestone: TrailPhysicalMilestoneRecord,
): string {
  if (
    milestone.id.trim() === ""
    || milestone.projectId.trim() === ""
    || !isValidTrailTitle(milestone.title)
    || (milestone.due !== undefined && !isTrailEpochMilliseconds(milestone.due))
  ) {
    throw new ProjectMarkdownMutationError(
      "verification-failed",
      "Cannot serialize an invalid Milestone physical record",
    );
  }
  const metadata: Record<string, unknown> = {
    id: milestone.id,
    projectId: milestone.projectId,
  };
  if (milestone.due !== undefined) metadata.due = milestone.due;
  const lines = [
    `## ${normalizeTrailTitle(milestone.title)}`,
    `<!-- data ${JSON.stringify(metadata)} -->`,
  ];
  const description = milestone.description === undefined
    ? undefined
    : normalizeMarkdownRecordBody(milestone.description);
  if (description !== undefined) lines.push("", description);
  return lines.join("\n");
}
