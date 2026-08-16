import {
  createTrailSequencedEntityPath,
  readTrailEntityFileSequence,
  TRAIL_INITIATIVES_PATH,
  TRAIL_PROJECTS_PATH,
} from "../../markdown/schema/trail-paths";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";

export type TrailFileBackedEntityKind = "initiative" | "project";

function directoryFor(kind: TrailFileBackedEntityKind): string {
  return kind === "initiative" ? TRAIL_INITIATIVES_PATH : TRAIL_PROJECTS_PATH;
}

export async function allocateTrailFileBackedEntityPath(
  repository: Pick<TrailDomainSourceRepository, "list">,
  kind: TrailFileBackedEntityKind,
  title: string,
): Promise<string> {
  const directory = directoryFor(kind);
  const entries = await repository.list(directory);
  const sequences = entries
    .filter((entry) => entry.kind === "file")
    .map((entry) => readTrailEntityFileSequence(entry.name))
    .filter((value): value is number => value !== undefined);
  const sequence = (sequences.length === 0 ? 0 : Math.max(...sequences)) + 1;
  if (sequence > 9999) throw new Error(`No Trail ${kind} file sequence is available`);
  return createTrailSequencedEntityPath(directory, sequence, title);
}

export function projectTrailRenamedFileBackedPath(
  currentPath: string,
  kind: TrailFileBackedEntityKind,
  title: string,
): string {
  const slash = currentPath.lastIndexOf("/");
  const directory = slash < 0 ? "" : currentPath.slice(0, slash);
  const name = slash < 0 ? currentPath : currentPath.slice(slash + 1);
  if (directory !== directoryFor(kind)) {
    throw new Error(`Existing ${kind} source is outside its canonical directory: ${currentPath}`);
  }
  const sequence = readTrailEntityFileSequence(name);
  if (sequence === undefined) {
    throw new Error(`Existing ${kind} source does not use a canonical sequence: ${currentPath}`);
  }
  return createTrailSequencedEntityPath(directory, sequence, title);
}
