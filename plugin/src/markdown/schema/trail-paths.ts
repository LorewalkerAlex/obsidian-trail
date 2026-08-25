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

/** Fresh bootstrap reserves Project sequence 0000; ordinary allocation still begins at 0001. */
export const TRAIL_FRESH_WORKSPACE_PROJECT_SEQUENCE = 0 as const;

export const TRAIL_TRIAGE_PATH = `${TRAIL_COLLECTIONS_PATH}/Triage.md` as const;
export const TRAIL_CYCLES_PATH = `${TRAIL_COLLECTIONS_PATH}/Cycles.md` as const;
export const TRAIL_WEEKLY_UPDATE_PATH = `${TRAIL_COLLECTIONS_PATH}/Weekly Update.md` as const;

export const TRAIL_REQUIRED_SINGLETON_PATHS = [
  TRAIL_TRIAGE_PATH,
  TRAIL_CYCLES_PATH,
] as const;

export const TRAIL_INITIATIVES_PREFIX = `${TRAIL_INITIATIVES_PATH}/` as const;
export const TRAIL_PROJECTS_PREFIX = `${TRAIL_PROJECTS_PATH}/` as const;
const TRAIL_MANAGED_PREFIX = `${TRAIL_MANAGED_ROOT}/` as const;
const SEQUENCED_ENTITY_FILENAME = /^(\d{4}) (.+)\.md$/;

function isDirectMarkdownChild(path: string, prefix: string): boolean {
  return path.startsWith(prefix)
    && path.endsWith(".md")
    && !path.slice(prefix.length).includes("/");
}

export function isTrailManagedPath(path: string): boolean {
  return path === TRAIL_MANAGED_ROOT || path.startsWith(TRAIL_MANAGED_PREFIX);
}

export function isTrailInitiativeMarkdownPath(path: string): boolean {
  return isDirectMarkdownChild(path, TRAIL_INITIATIVES_PREFIX);
}

export function isTrailProjectMarkdownPath(path: string): boolean {
  return isDirectMarkdownChild(path, TRAIL_PROJECTS_PREFIX);
}

export function isTrailDomainSingletonPath(path: string): boolean {
  return (TRAIL_REQUIRED_SINGLETON_PATHS as readonly string[]).includes(path);
}

export function isTrailUtilityPath(path: string): boolean {
  return path === TRAIL_WEEKLY_UPDATE_PATH;
}

export function isTrailDomainMarkdownPath(path: string): boolean {
  return isTrailInitiativeMarkdownPath(path)
    || isTrailProjectMarkdownPath(path)
    || isTrailDomainSingletonPath(path);
}

export function readTrailEntityFileSequence(name: string): number | undefined {
  const match = SEQUENCED_ENTITY_FILENAME.exec(name);
  if (match === null) return undefined;
  return Number(match[1]);
}

export function isTrailSequencedEntityFilename(name: string): boolean {
  return readTrailEntityFileSequence(name) !== undefined;
}

export function sanitizeTrailFilenameSuffix(title: string, fallback = "Untitled"): string {
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
  if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence > 9999) {
    throw new Error("Trail physical sequence must be an integer from 0 to 9999");
  }
  return `${directory}/${String(sequence).padStart(4, "0")} ${sanitizeTrailFilenameSuffix(title, fallback)}.md`;
}
