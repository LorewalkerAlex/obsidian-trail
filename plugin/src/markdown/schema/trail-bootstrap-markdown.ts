import {
  TRAIL_BOOTSTRAP_DIRECTORIES,
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_PATH,
} from "./trail-paths";
import {
  TRAIL_PHYSICAL_SOURCE_SCHEMAS,
  type TrailDomainSourceKind,
} from "./trail-physical-schema";

function emptySingletonMarkdown(
  kind: Extract<TrailDomainSourceKind, "cycles" | "projectless-issues" | "triage">,
): string {
  const schema = TRAIL_PHYSICAL_SOURCE_SCHEMAS[kind];
  return [
    "---",
    `kind: ${schema.frontmatterKind}`,
    "---",
    "",
    `# ${schema.rootSections[0]}`,
    "",
  ].join("\n");
}

export const TRAIL_TRIAGE_EMPTY_MARKDOWN = emptySingletonMarkdown("triage");
export const TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN = emptySingletonMarkdown(
  "projectless-issues",
);
export const TRAIL_CYCLES_EMPTY_MARKDOWN = emptySingletonMarkdown("cycles");

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

/** Stable manifest consumed later by Source Sync bootstrap orchestration. */
export const TRAIL_BOOTSTRAP_MARKDOWN = {
  directories: TRAIL_BOOTSTRAP_DIRECTORIES,
  files: TRAIL_BOOTSTRAP_FILES,
} as const;
