/**
 * Current Formal managed-scope constants used by bootstrap and workspace classification.
 * These are implementation representations of the canonical Physical Model, not a
 * second persisted schema or schema-version mechanism.
 */
export const TRAIL_MANAGED_ROOT = "Trail" as const;

export const TRAIL_TOP_LEVEL_DIRECTORIES = [
  "Initiatives",
  "Projects",
  "Collections",
] as const;

export const TRAIL_BOOTSTRAP_DIRECTORIES = [
  "Trail",
  "Trail/Initiatives",
  "Trail/Projects",
  "Trail/Collections",
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
  {
    path: TRAIL_TRIAGE_PATH,
    content: TRAIL_TRIAGE_EMPTY_MARKDOWN,
  },
  {
    path: TRAIL_PROJECTLESS_ISSUES_PATH,
    content: TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN,
  },
  {
    path: TRAIL_CYCLES_PATH,
    content: TRAIL_CYCLES_EMPTY_MARKDOWN,
  },
] as const;

export const TRAIL_PROJECTS_PATH = "Trail/Projects" as const;
export const TRAIL_PROJECTS_PREFIX = `${TRAIL_PROJECTS_PATH}/` as const;

export function isTrailProjectMarkdownPath(path: string): boolean {
  return (
    path.startsWith(TRAIL_PROJECTS_PREFIX)
    && path.endsWith(".md")
    && !path.slice(TRAIL_PROJECTS_PREFIX.length).includes("/")
  );
}
