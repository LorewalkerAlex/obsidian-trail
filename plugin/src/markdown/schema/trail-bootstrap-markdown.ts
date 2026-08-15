import {
  TRAIL_BOOTSTRAP_DIRECTORIES,
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_PATH,
} from "./trail-paths";

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

/** Stable manifest consumed by Fresh Workspace bootstrap orchestration. */
export const TRAIL_BOOTSTRAP_MARKDOWN = {
  directories: TRAIL_BOOTSTRAP_DIRECTORIES,
  files: TRAIL_BOOTSTRAP_FILES,
} as const;
