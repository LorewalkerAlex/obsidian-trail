import { fromMarkdown } from "mdast-util-from-markdown";

import {
  isTrailEpochMilliseconds,
  isTrailEstimateCarrier,
  isTrailPriority,
  isValidTrailTitle,
  normalizeTrailTitle,
  sameTrailWorkflowIssue,
  type TrailRecordSourceRange,
  type TrailWorkflowIssue,
} from "./trail-issue";
import {
  validateTrailProjectFields,
  type TrailProject,
} from "./trail-project";
import type { TrailSourceIssue } from "./trail-source-issue";
import type { TrailYamlParser } from "./trail-triage-markdown";

type RootChild = ReturnType<typeof fromMarkdown>["children"][number];
type HeadingNode = Extract<RootChild, { type: "heading" }>;
type HtmlNode = Extract<RootChild, { type: "html" }>;

export type TrailProjectParseIssue = TrailSourceIssue;

export interface TrailProjectContribution {
  readonly filePath: string;
  readonly issuesById: Readonly<Record<string, TrailWorkflowIssue>>;
  readonly project: TrailProject;
  readonly sourceByIssueId: Readonly<Record<string, TrailRecordSourceRange>>;
}

export interface TrailProjectParseResult {
  readonly contribution?: TrailProjectContribution;
  readonly issues: readonly TrailProjectParseIssue[];
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

const DATA_MARKER = /^<!-- data (\{.*\}) -->$/;
const PROJECT_METADATA_KEYS = new Set([
  "statusDefinitionId",
  "initiativeId",
  "priority",
  "due",
  "labelIds",
]);
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

interface IssueCandidate {
  readonly issue: TrailWorkflowIssue;
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

function parseRequiredString(
  metadata: Record<string, unknown>,
  key: string,
  issues: string[],
): string | undefined {
  const value = metadata[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${key} must be non-empty text`);
    return undefined;
  }
  return value;
}

function parseOptionalEpoch(
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

function parseRequiredEpoch(
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

function parseProjectMetadata(
  raw: string,
  id: string,
  title: string,
  description: string | undefined,
): { readonly project?: TrailProject; readonly issues: string[] } {
  const issues: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { issues: ["Project data marker must contain valid JSON"] };
  }
  if (!isRecord(parsed)) {
    return { issues: ["Project data marker JSON must be an object"] };
  }
  for (const key of Object.keys(parsed)) {
    if (!PROJECT_METADATA_KEYS.has(key)) {
      issues.push(`unknown Project metadata field: ${key}`);
    }
  }

  const statusDefinitionId = parseRequiredString(
    parsed,
    "statusDefinitionId",
    issues,
  );
  const initiativeId = parseOptionalString(parsed, "initiativeId", issues);
  let priority: TrailProject["priority"];
  if (parsed.priority !== undefined) {
    if (!isTrailPriority(parsed.priority)) {
      issues.push("priority must be urgent, high, medium, or low");
    } else {
      priority = parsed.priority;
    }
  }
  const due = parseOptionalEpoch(parsed, "due", issues);
  const labelIds = parseLabelIds(parsed.labelIds, issues);

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

function parseWorkflowIssueMetadata(
  raw: string,
  projectId: string,
): {
  readonly issue?: Omit<TrailWorkflowIssue, "description" | "title">;
  readonly issues: string[];
} {
  const issues: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { issues: ["Issue data marker must contain valid JSON"] };
  }
  if (!isRecord(parsed)) {
    return { issues: ["Issue data marker JSON must be an object"] };
  }
  for (const key of Object.keys(parsed)) {
    if (!ISSUE_METADATA_KEYS.has(key)) {
      issues.push(`unknown Issue metadata field: ${key}`);
    }
  }

  const id = parseRequiredString(parsed, "id", issues);
  if (parsed.context !== "workflow") {
    issues.push("context must be workflow in a Project Issue section");
  }
  const statusDefinitionId = parseRequiredString(
    parsed,
    "statusDefinitionId",
    issues,
  );
  const parsedProjectId = parseRequiredString(parsed, "projectId", issues);
  if (parsedProjectId !== undefined && parsedProjectId !== projectId) {
    issues.push("projectId must match the owning Project file");
  }
  const milestoneId = parseOptionalString(parsed, "milestoneId", issues);

  let priority: TrailWorkflowIssue["priority"];
  if (parsed.priority !== undefined) {
    if (!isTrailPriority(parsed.priority)) {
      issues.push("priority must be urgent, high, medium, or low");
    } else {
      priority = parsed.priority;
    }
  }

  let estimate: number | undefined;
  if (parsed.estimate !== undefined) {
    if (!isTrailEstimateCarrier(parsed.estimate)) {
      issues.push("estimate must be a non-negative integer when present");
    } else {
      estimate = parsed.estimate;
    }
  }

  const due = parseOptionalEpoch(parsed, "due", issues);
  const labelIds = parseLabelIds(parsed.labelIds, issues);
  const createdAt = parseRequiredEpoch(parsed, "createdAt", issues);
  const firstStartedAt = parseOptionalEpoch(parsed, "firstStartedAt", issues);
  const terminalAt = parseOptionalEpoch(parsed, "terminalAt", issues);

  if (
    id === undefined
    || statusDefinitionId === undefined
    || parsedProjectId === undefined
    || createdAt === undefined
    || issues.length > 0
  ) {
    return { issues };
  }

  return {
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
      projectId: parsedProjectId,
      statusDefinitionId,
      terminalAt,
    },
    issues,
  };
}

function fileIssue(
  code: string,
  filePath: string,
  message: string,
  offset?: number,
): TrailProjectParseIssue {
  return {
    code,
    filePath,
    message,
    offset,
    scope: "file",
  };
}

function recordIssue(
  code: string,
  filePath: string,
  message: string,
  objectId?: string,
  offset?: number,
): TrailProjectParseIssue {
  return {
    code,
    filePath,
    message,
    objectId,
    offset,
    scope: "record",
  };
}

function parseFrontmatterIdentity(
  input: ParseProjectMarkdownInput,
  frontmatter: FrontmatterSlice,
  issues: TrailProjectParseIssue[],
): string | undefined {
  let value: unknown;
  try {
    value = input.parseYaml(frontmatter.yaml);
  } catch {
    value = undefined;
  }

  if (
    !isRecord(value)
    || Object.keys(value).some((key) => key !== "kind" && key !== "id")
    || Object.keys(value).length !== 2
    || value.kind !== "project"
    || typeof value.id !== "string"
    || value.id.trim() === ""
  ) {
    issues.push(fileIssue(
      "project.frontmatter.invalid",
      input.filePath,
      "Project frontmatter must contain exactly kind: project and a non-empty id",
    ));
    return undefined;
  }
  return value.id;
}

/** Parses one authoritative Project file including its Workflow Issue records. */
export function parseProjectMarkdown(
  input: ParseProjectMarkdownInput,
): TrailProjectParseResult {
  const issues: TrailProjectParseIssue[] = [];
  const frontmatter = splitFrontmatter(input.markdown);
  if (frontmatter === null) {
    return {
      issues: [fileIssue(
        "project.frontmatter.missing",
        input.filePath,
        "Project file requires a frontmatter block",
      )],
    };
  }

  const projectId = parseFrontmatterIdentity(input, frontmatter, issues);
  const body = input.markdown.slice(frontmatter.bodyStartOffset);
  const children = fromMarkdown(body).children;
  const h1Entries = children
    .map((node, index) => ({ index, node }))
    .filter((entry): entry is { readonly index: number; readonly node: HeadingNode } =>
      isHeading(entry.node, 1));
  const expectedH1 = ["Project", "Milestones", "Issues"];
  const actualH1 = h1Entries.map(({ node }) => headingText(node));

  if (
    h1Entries.length !== expectedH1.length
    || actualH1.some((heading, index) => heading !== expectedH1[index])
  ) {
    issues.push(fileIssue(
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
    issues.push(fileIssue(
      "project.structure.orphan-before-project",
      input.filePath,
      "No root content may appear before # Project",
    ));
  }

  const projectRegion = children.slice(projectH1.index + 1, milestonesH1.index);
  const projectHeading = projectRegion[0];
  if (!projectHeading || !isHeading(projectHeading, 2)) {
    issues.push(fileIssue(
      "project.record.missing",
      input.filePath,
      "# Project must contain exactly one H2 Project record",
    ));
    return { issues };
  }
  if (projectRegion.filter((node) => isHeading(node, 2)).length !== 1) {
    issues.push(fileIssue(
      "project.record.count",
      input.filePath,
      "# Project must contain exactly one H2 Project record",
    ));
  }

  const projectMarker = projectRegion[1];
  const projectMarkers = projectRegion.slice(1).filter(isDataMarker);
  const projectJson = markerJson(projectMarker);
  const projectTitle = normalizeTrailTitle(headingText(projectHeading));
  if (!isValidTrailTitle(projectTitle)) {
    issues.push(recordIssue(
      "project.record.title-invalid",
      input.filePath,
      "Project title must be non-empty single-line text",
      projectId,
      frontmatter.bodyStartOffset + requiredOffset(projectHeading, "start"),
    ));
  }
  if (projectJson === null) {
    issues.push(recordIssue(
      "project.record.marker-position",
      input.filePath,
      "Project metadata marker must immediately follow the Project H2",
      projectId,
    ));
  }
  if (projectMarkers.length !== 1) {
    issues.push(recordIssue(
      "project.record.marker-count",
      input.filePath,
      "Project record requires exactly one metadata marker",
      projectId,
    ));
  }

  const milestoneRegion = children.slice(milestonesH1.index + 1, issuesH1.index);
  if (milestoneRegion.length > 0) {
    issues.push(fileIssue(
      "project.milestones.unsupported",
      input.filePath,
      "Milestone records are not supported by the current Workflow Entry slice",
      frontmatter.bodyStartOffset + requiredOffset(milestoneRegion[0], "start"),
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

  const projectMarkerEnd = requiredOffset(projectMarker, "end");
  const projectDescription = normalizeDescription(body.slice(
    projectMarkerEnd,
    requiredOffset(milestonesH1.node, "start"),
  ));
  const parsedProject = parseProjectMetadata(
    projectJson,
    projectId,
    projectTitle,
    projectDescription,
  );
  parsedProject.issues.forEach((message) => {
    issues.push(recordIssue(
      "project.record.metadata-invalid",
      input.filePath,
      message,
      projectId,
      frontmatter.bodyStartOffset + requiredOffset(projectMarker, "start"),
    ));
  });
  if (parsedProject.project === undefined) {
    return { issues };
  }

  const candidates: IssueCandidate[] = [];
  let index = issuesH1.index + 1;
  while (index < children.length) {
    const node = children[index];
    if (!isHeading(node, 2)) {
      issues.push(fileIssue(
        "project.issues.orphan-content",
        input.filePath,
        "Root content under # Issues must belong to an H2 Issue record",
        frontmatter.bodyStartOffset + requiredOffset(node, "start"),
      ));
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
    const recordEnd = nextBoundary < children.length
      ? requiredOffset(children[nextBoundary], "start")
      : body.length;

    if (!isValidTrailTitle(title)) {
      issues.push(recordIssue(
        "project.issue.title-invalid",
        input.filePath,
        "Workflow Issue title must be non-empty single-line text",
        undefined,
        frontmatter.bodyStartOffset + recordStart,
      ));
    }
    if (json === null) {
      issues.push(recordIssue(
        "project.issue.marker-position",
        input.filePath,
        `Metadata marker must immediately follow H2: ${title}`,
        undefined,
        frontmatter.bodyStartOffset + recordStart,
      ));
    }
    if (markerNodes.length !== 1) {
      issues.push(recordIssue(
        "project.issue.marker-count",
        input.filePath,
        `Expected exactly one metadata marker for H2: ${title}`,
        undefined,
        frontmatter.bodyStartOffset + recordStart,
      ));
    }

    if (json !== null && markerNodes.length === 1 && isValidTrailTitle(title)) {
      const metadata = parseWorkflowIssueMetadata(json, projectId);
      const objectId = metadata.issue?.id;
      metadata.issues.forEach((message) => {
        issues.push(recordIssue(
          "project.issue.metadata-invalid",
          input.filePath,
          message,
          objectId,
          frontmatter.bodyStartOffset + requiredOffset(immediateMarker, "start"),
        ));
      });
      if (metadata.issue !== undefined && metadata.issues.length === 0) {
        const markerEnd = requiredOffset(immediateMarker, "end");
        candidates.push({
          issue: {
            ...metadata.issue,
            description: normalizeDescription(body.slice(markerEnd, recordEnd)),
            title,
          },
          source: {
            endOffset: frontmatter.bodyStartOffset + recordEnd,
            filePath: input.filePath,
            markerEndOffset: frontmatter.bodyStartOffset + markerEnd,
            markerStartOffset:
              frontmatter.bodyStartOffset + requiredOffset(immediateMarker, "start"),
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
  duplicateIds.forEach((id) => {
    issues.push(recordIssue(
      "project.issue.id-duplicate",
      input.filePath,
      `Duplicate Workflow Issue ID: ${id}`,
      id,
    ));
  });

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

function canonicalWorkflowIssueMetadata(
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
    : normalizeDescription(issue.description);
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
    : normalizeDescription(project.description);
  if (description !== undefined) lines.push("", description);
  lines.push("", "# Milestones", "", "# Issues", "");
  return lines.join("\n");
}

interface ProjectMutationInput extends ParseProjectMarkdownInput {
  readonly expectedProject: TrailProject;
}

function requireCurrentProject(
  input: ProjectMutationInput,
): TrailProjectContribution {
  const current = parseProjectMarkdown(input);
  if (current.issues.length > 0 || current.contribution === undefined) {
    throw new ProjectMarkdownMutationError(
      "source-invalid",
      "Refused to mutate an invalid Project source",
    );
  }

  const latestProject = current.contribution.project;
  // Issue creation only depends on the target Project identity and lifecycle status.
  // Preserve unrelated external Project edits instead of turning them into false conflicts.
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

/** Appends a new Workflow Issue to the latest valid Project snapshot. */
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

  const block = serializeWorkflowIssue(input.issue);
  const base = input.markdown.replace(/[\r\n]+$/, "");
  const next = `${base}\n\n${block}\n`;
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

/** Updates only the Workflow Issue heading and metadata, preserving body bytes. */
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

  const headingLine = readLine(input.markdown, current.source.startOffset);
  const nextMarker = `<!-- data ${JSON.stringify(
    canonicalWorkflowIssueMetadata(input.issue),
  )} -->`;
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
