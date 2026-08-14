export const TRAIL_MANAGED_ROOT = "Trail" as const;
export const TRAIL_INITIATIVES_PATH = "Trail/Initiatives" as const;
export const TRAIL_PROJECTS_PATH = "Trail/Projects" as const;
export const TRAIL_COLLECTIONS_PATH = "Trail/Collections" as const;

export const TRAIL_TOP_LEVEL_DIRECTORIES = [
  "Initiatives",
  "Projects",
  "Collections",
] as const;

export const TRAIL_BOOTSTRAP_DIRECTORIES = [
  TRAIL_MANAGED_ROOT,
  TRAIL_INITIATIVES_PATH,
  TRAIL_PROJECTS_PATH,
  TRAIL_COLLECTIONS_PATH,
] as const;

export const TRAIL_TRIAGE_PATH = "Trail/Collections/Triage.md" as const;
export const TRAIL_PROJECTLESS_ISSUES_PATH =
  "Trail/Collections/Projectless Issues.md" as const;
export const TRAIL_CYCLES_PATH = "Trail/Collections/Cycles.md" as const;

export const TRAIL_REQUIRED_SINGLETON_PATHS = [
  TRAIL_TRIAGE_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_CYCLES_PATH,
] as const;

export const TRAIL_TRIAGE_EMPTY_MARKDOWN = [
  "---",
  "kind: triage",
  "---",
  "",
  "# Issues",
  "",
].join("\n");

export const TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN = [
  "---",
  "kind: projectless-issues",
  "---",
  "",
  "# Issues",
  "",
].join("\n");

export const TRAIL_CYCLES_EMPTY_MARKDOWN = [
  "---",
  "kind: cycles",
  "---",
  "",
  "# Cycles",
  "",
].join("\n");

export interface BootstrapMarkdownFile {
  readonly content: string;
  readonly path: string;
}

export const TRAIL_BOOTSTRAP_FILES: readonly BootstrapMarkdownFile[] = [
  { path: TRAIL_TRIAGE_PATH, content: TRAIL_TRIAGE_EMPTY_MARKDOWN },
  {
    path: TRAIL_PROJECTLESS_ISSUES_PATH,
    content: TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN,
  },
  { path: TRAIL_CYCLES_PATH, content: TRAIL_CYCLES_EMPTY_MARKDOWN },
] as const;

export const TRAIL_INITIATIVES_PREFIX = `${TRAIL_INITIATIVES_PATH}/` as const;
export const TRAIL_PROJECTS_PREFIX = `${TRAIL_PROJECTS_PATH}/` as const;

const SEQUENCED_ENTITY_FILENAME = /^(\d{4}) (.+)\.md$/;

export function isTrailInitiativeMarkdownPath(path: string): boolean {
  return (
    path.startsWith(TRAIL_INITIATIVES_PREFIX)
    && path.endsWith(".md")
    && !path.slice(TRAIL_INITIATIVES_PREFIX.length).includes("/")
  );
}

export function isTrailProjectMarkdownPath(path: string): boolean {
  return (
    path.startsWith(TRAIL_PROJECTS_PREFIX)
    && path.endsWith(".md")
    && !path.slice(TRAIL_PROJECTS_PREFIX.length).includes("/")
  );
}

export function readTrailEntityFileSequence(name: string): number | undefined {
  const match = SEQUENCED_ENTITY_FILENAME.exec(name);
  if (match === null) {
    return undefined;
  }
  return Number(match[1]);
}

export function isTrailSequencedEntityFilename(name: string): boolean {
  return readTrailEntityFileSequence(name) !== undefined;
}

export function sanitizeTrailFilenameSuffix(
  title: string,
  fallback = "Untitled",
): string {
  const sanitized = title
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return sanitized === "" ? fallback : sanitized;
}

export function createTrailSequencedEntityPath(
  directory: string,
  sequence: number,
  title: string,
  fallback = "Untitled",
): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 9999) {
    throw new Error("Trail physical sequence must be an integer from 1 to 9999");
  }
  return `${directory}/${String(sequence).padStart(4, "0")} ${sanitizeTrailFilenameSuffix(
    title,
    fallback,
  )}.md`;
}

export type TrailDomainSourceKind =
  | "initiative"
  | "project"
  | "triage"
  | "projectless-issues"
  | "cycles";

export type TrailPhysicalFieldCarrier =
  | "frontmatter"
  | "heading"
  | "body"
  | "metadata"
  | "derived-heading";

export type TrailPhysicalFieldType =
  | "id"
  | "text"
  | "priority"
  | "issue-context"
  | "status-definition-id"
  | "timestamp"
  | "integer"
  | "id-set";

export interface TrailPhysicalFieldSpec {
  readonly carrier: TrailPhysicalFieldCarrier;
  readonly required: boolean;
  readonly type: TrailPhysicalFieldType;
}

export interface TrailPhysicalRecordSchema {
  readonly fields: Readonly<Record<string, TrailPhysicalFieldSpec>>;
  readonly metadataOrder: readonly string[];
}

export interface TrailPhysicalSourceSchema {
  readonly frontmatterKind: TrailDomainSourceKind;
  readonly records: Readonly<Record<string, TrailPhysicalRecordSchema>>;
  readonly rootSections: readonly string[];
}

const ID_FRONTMATTER: TrailPhysicalFieldSpec = {
  carrier: "frontmatter",
  required: true,
  type: "id",
};
const TITLE_HEADING: TrailPhysicalFieldSpec = {
  carrier: "heading",
  required: true,
  type: "text",
};
const DESCRIPTION_BODY: TrailPhysicalFieldSpec = {
  carrier: "body",
  required: false,
  type: "text",
};

export const TRAIL_PHYSICAL_RECORD_SCHEMAS = {
  initiative: {
    fields: {
      id: ID_FRONTMATTER,
      title: TITLE_HEADING,
      description: DESCRIPTION_BODY,
      priority: { carrier: "metadata", required: false, type: "priority" },
      due: { carrier: "metadata", required: false, type: "timestamp" },
      labelIds: { carrier: "metadata", required: false, type: "id-set" },
    },
    metadataOrder: ["priority", "due", "labelIds"],
  },
  project: {
    fields: {
      id: ID_FRONTMATTER,
      title: TITLE_HEADING,
      description: DESCRIPTION_BODY,
      statusDefinitionId: {
        carrier: "metadata",
        required: true,
        type: "status-definition-id",
      },
      initiativeId: { carrier: "metadata", required: false, type: "id" },
      priority: { carrier: "metadata", required: false, type: "priority" },
      due: { carrier: "metadata", required: false, type: "timestamp" },
      labelIds: { carrier: "metadata", required: false, type: "id-set" },
    },
    metadataOrder: [
      "statusDefinitionId",
      "initiativeId",
      "priority",
      "due",
      "labelIds",
    ],
  },
  milestone: {
    fields: {
      id: { carrier: "metadata", required: true, type: "id" },
      title: TITLE_HEADING,
      description: DESCRIPTION_BODY,
      projectId: { carrier: "metadata", required: true, type: "id" },
      due: { carrier: "metadata", required: false, type: "timestamp" },
    },
    metadataOrder: ["id", "projectId", "due"],
  },
  issue: {
    fields: {
      id: { carrier: "metadata", required: true, type: "id" },
      title: TITLE_HEADING,
      description: DESCRIPTION_BODY,
      context: { carrier: "metadata", required: true, type: "issue-context" },
      statusDefinitionId: {
        carrier: "metadata",
        required: false,
        type: "status-definition-id",
      },
      projectId: { carrier: "metadata", required: false, type: "id" },
      milestoneId: { carrier: "metadata", required: false, type: "id" },
      priority: { carrier: "metadata", required: false, type: "priority" },
      estimate: { carrier: "metadata", required: false, type: "integer" },
      due: { carrier: "metadata", required: false, type: "timestamp" },
      labelIds: { carrier: "metadata", required: false, type: "id-set" },
      createdAt: { carrier: "metadata", required: false, type: "timestamp" },
      firstStartedAt: { carrier: "metadata", required: false, type: "timestamp" },
      terminalAt: { carrier: "metadata", required: false, type: "timestamp" },
    },
    metadataOrder: [
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
    ],
  },
  cycle: {
    fields: {
      id: { carrier: "metadata", required: true, type: "id" },
      label: { carrier: "derived-heading", required: true, type: "text" },
      startedAt: { carrier: "metadata", required: true, type: "timestamp" },
      plannedEnd: { carrier: "metadata", required: true, type: "timestamp" },
      endedAt: { carrier: "metadata", required: false, type: "timestamp" },
      issueIds: { carrier: "metadata", required: false, type: "id-set" },
    },
    metadataOrder: ["id", "startedAt", "plannedEnd", "endedAt", "issueIds"],
  },
} as const satisfies Readonly<Record<string, TrailPhysicalRecordSchema>>;

export const TRAIL_PHYSICAL_SOURCE_SCHEMAS = {
  initiative: {
    frontmatterKind: "initiative",
    records: { initiative: TRAIL_PHYSICAL_RECORD_SCHEMAS.initiative },
    rootSections: ["Initiative"],
  },
  project: {
    frontmatterKind: "project",
    records: {
      project: TRAIL_PHYSICAL_RECORD_SCHEMAS.project,
      milestone: TRAIL_PHYSICAL_RECORD_SCHEMAS.milestone,
      issue: TRAIL_PHYSICAL_RECORD_SCHEMAS.issue,
    },
    rootSections: ["Project", "Milestones", "Issues"],
  },
  triage: {
    frontmatterKind: "triage",
    records: { issue: TRAIL_PHYSICAL_RECORD_SCHEMAS.issue },
    rootSections: ["Issues"],
  },
  "projectless-issues": {
    frontmatterKind: "projectless-issues",
    records: { issue: TRAIL_PHYSICAL_RECORD_SCHEMAS.issue },
    rootSections: ["Issues"],
  },
  cycles: {
    frontmatterKind: "cycles",
    records: { cycle: TRAIL_PHYSICAL_RECORD_SCHEMAS.cycle },
    rootSections: ["Cycles"],
  },
} as const satisfies Readonly<Record<TrailDomainSourceKind, TrailPhysicalSourceSchema>>;
