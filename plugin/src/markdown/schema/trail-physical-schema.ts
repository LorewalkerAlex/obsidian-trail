export type TrailDomainSourceKind =
  | "initiative"
  | "project"
  | "triage"
  | "cycles";

export type TrailPhysicalRecordKind =
  | "initiative"
  | "project"
  | "milestone"
  | "issue"
  | "cycle";

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
  | "estimate"
  | "issue-context"
  | "status-definition-id"
  | "timestamp"
  | "id-set";

export type TrailPhysicalMissingBehavior = "error" | "undefined" | "empty-set" | "derived";

export interface TrailPhysicalFieldSpec {
  readonly carrier: TrailPhysicalFieldCarrier;
  readonly missing: TrailPhysicalMissingBehavior;
  readonly required: boolean;
  readonly type: TrailPhysicalFieldType;
}

export interface TrailPhysicalRecordSchema {
  readonly fields: Readonly<Record<string, TrailPhysicalFieldSpec>>;
  readonly metadataOrder: readonly string[];
}

export interface TrailPhysicalSourceSchema {
  readonly frontmatterKind: TrailDomainSourceKind;
  readonly recordSections: Readonly<Record<string, readonly TrailPhysicalRecordKind[]>>;
  readonly rootSections: readonly string[];
}

const required = (
  carrier: TrailPhysicalFieldCarrier,
  type: TrailPhysicalFieldType,
): TrailPhysicalFieldSpec => ({ carrier, missing: "error", required: true, type });

const optional = (
  carrier: TrailPhysicalFieldCarrier,
  type: TrailPhysicalFieldType,
  missing: TrailPhysicalMissingBehavior = "undefined",
): TrailPhysicalFieldSpec => ({ carrier, missing, required: false, type });

const ID_FRONTMATTER = required("frontmatter", "id");
const TITLE_HEADING = required("heading", "text");
const DESCRIPTION_BODY = optional("body", "text");

export const TRAIL_PHYSICAL_RECORD_SCHEMAS = {
  initiative: {
    fields: {
      id: ID_FRONTMATTER,
      title: TITLE_HEADING,
      description: DESCRIPTION_BODY,
      priority: optional("metadata", "priority"),
      due: optional("metadata", "timestamp"),
      labelIds: optional("metadata", "id-set", "empty-set"),
    },
    metadataOrder: ["priority", "due", "labelIds"],
  },
  project: {
    fields: {
      id: ID_FRONTMATTER,
      title: TITLE_HEADING,
      description: DESCRIPTION_BODY,
      statusDefinitionId: required("metadata", "status-definition-id"),
      initiativeId: optional("metadata", "id"),
      priority: optional("metadata", "priority"),
      due: optional("metadata", "timestamp"),
      labelIds: optional("metadata", "id-set", "empty-set"),
    },
    metadataOrder: ["statusDefinitionId", "initiativeId", "priority", "due", "labelIds"],
  },
  milestone: {
    fields: {
      id: required("metadata", "id"),
      title: TITLE_HEADING,
      description: DESCRIPTION_BODY,
      projectId: required("metadata", "id"),
      due: optional("metadata", "timestamp"),
    },
    metadataOrder: ["id", "projectId", "due"],
  },
  issue: {
    fields: {
      id: required("metadata", "id"),
      title: TITLE_HEADING,
      description: DESCRIPTION_BODY,
      context: required("metadata", "issue-context"),
      statusDefinitionId: optional("metadata", "status-definition-id"),
      projectId: optional("metadata", "id"),
      milestoneId: optional("metadata", "id"),
      priority: optional("metadata", "priority"),
      estimate: optional("metadata", "estimate"),
      due: optional("metadata", "timestamp"),
      labelIds: optional("metadata", "id-set", "empty-set"),
      createdAt: optional("metadata", "timestamp"),
      firstStartedAt: optional("metadata", "timestamp"),
      terminalAt: optional("metadata", "timestamp"),
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
      id: required("metadata", "id"),
      label: { carrier: "derived-heading", missing: "derived", required: true, type: "text" },
      startedAt: required("metadata", "timestamp"),
      plannedEnd: required("metadata", "timestamp"),
      endedAt: optional("metadata", "timestamp"),
      issueIds: optional("metadata", "id-set", "empty-set"),
    },
    metadataOrder: ["id", "startedAt", "plannedEnd", "endedAt", "issueIds"],
  },
} as const satisfies Readonly<Record<TrailPhysicalRecordKind, TrailPhysicalRecordSchema>>;

export const TRAIL_PHYSICAL_SOURCE_SCHEMAS = {
  initiative: {
    frontmatterKind: "initiative",
    recordSections: { Initiative: ["initiative"] },
    rootSections: ["Initiative"],
  },
  project: {
    frontmatterKind: "project",
    recordSections: {
      Project: ["project"],
      Milestones: ["milestone"],
      Issues: ["issue"],
    },
    rootSections: ["Project", "Milestones", "Issues"],
  },
  triage: {
    frontmatterKind: "triage",
    recordSections: { Issues: ["issue"] },
    rootSections: ["Issues"],
  },
  cycles: {
    frontmatterKind: "cycles",
    recordSections: { Cycles: ["cycle"] },
    rootSections: ["Cycles"],
  },
} as const satisfies Readonly<Record<TrailDomainSourceKind, TrailPhysicalSourceSchema>>;
