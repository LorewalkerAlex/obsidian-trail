export const TRAIL_MANAGED_ROOT = "Trail" as const;
export const TRAIL_INITIATIVES_PATH = `${TRAIL_MANAGED_ROOT}/Initiatives` as const;
export const TRAIL_PROJECTS_PATH = `${TRAIL_MANAGED_ROOT}/Projects` as const;
export const TRAIL_COLLECTIONS_PATH = `${TRAIL_MANAGED_ROOT}/Collections` as const;

export const TRAIL_TOP_LEVEL_DIRECTORIES = [
  "Initiatives",
  "Projects",
  "Collections",
] as const;

export const TRAIL_TOP_LEVEL_DIRECTORY_PATHS = [
  TRAIL_INITIATIVES_PATH,
  TRAIL_PROJECTS_PATH,
  TRAIL_COLLECTIONS_PATH,
] as const;

export const TRAIL_BOOTSTRAP_DIRECTORIES = [
  TRAIL_MANAGED_ROOT,
  ...TRAIL_TOP_LEVEL_DIRECTORY_PATHS,
] as const;

export const TRAIL_TRIAGE_PATH = `${TRAIL_COLLECTIONS_PATH}/Triage.md` as const;
export const TRAIL_PROJECTLESS_ISSUES_PATH =
  `${TRAIL_COLLECTIONS_PATH}/Projectless Issues.md` as const;
export const TRAIL_CYCLES_PATH = `${TRAIL_COLLECTIONS_PATH}/Cycles.md` as const;

export const TRAIL_REQUIRED_SINGLETON_PATHS = [
  TRAIL_TRIAGE_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_CYCLES_PATH,
] as const;

export const TRAIL_INITIATIVES_PREFIX = `${TRAIL_INITIATIVES_PATH}/` as const;
export const TRAIL_PROJECTS_PREFIX = `${TRAIL_PROJECTS_PATH}/` as const;
const TRAIL_MANAGED_PREFIX = `${TRAIL_MANAGED_ROOT}/` as const;
const SEQUENCED_ENTITY_FILENAME = /^(\d{4}) (.+)\.md$/;

function isDirectMarkdownChild(path: string, prefix: string): boolean {
  return (
    path.startsWith(prefix)
    && path.endsWith(".md")
    && !path.slice(prefix.length).includes("/")
  );
}

/** Returns whether the path is the managed Trail root or one of its descendants. */
export function isTrailManagedPath(path: string): boolean {
  return path === TRAIL_MANAGED_ROOT || path.startsWith(TRAIL_MANAGED_PREFIX);
}

/** Returns whether the path is a direct Initiative Markdown source. */
export function isTrailInitiativeMarkdownPath(path: string): boolean {
  return isDirectMarkdownChild(path, TRAIL_INITIATIVES_PREFIX);
}

/** Returns whether the path is a direct Project Markdown source. */
export function isTrailProjectMarkdownPath(path: string): boolean {
  return isDirectMarkdownChild(path, TRAIL_PROJECTS_PREFIX);
}

/** Returns whether a path is the Projects directory or one of its descendants. */
export function isTrailProjectsScopePath(path: string): boolean {
  return path === TRAIL_PROJECTS_PATH || path.startsWith(TRAIL_PROJECTS_PREFIX);
}

/** Reads the four-digit file-backed entity sequence from a filename. */
export function readTrailEntityFileSequence(name: string): number | undefined {
  const match = SEQUENCED_ENTITY_FILENAME.exec(name);
  if (match === null) {
    return undefined;
  }
  return Number(match[1]);
}

/** Returns whether a filename follows Trail's sequenced entity convention. */
export function isTrailSequencedEntityFilename(name: string): boolean {
  return readTrailEntityFileSequence(name) !== undefined;
}

/** Sanitizes a readable title for use as the suffix of a managed filename. */
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

/** Creates the canonical four-digit readable path for a file-backed entity. */
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