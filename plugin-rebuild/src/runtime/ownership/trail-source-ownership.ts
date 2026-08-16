export interface TrailSourceOwnership {
  readonly sourceByEntityId: ReadonlyMap<string, string>;
  readonly sourceEntityIdsByPath: ReadonlyMap<string, readonly string[]>;
}

export function createEmptyTrailSourceOwnership(): TrailSourceOwnership {
  return {
    sourceByEntityId: new Map(),
    sourceEntityIdsByPath: new Map(),
  };
}

/** Replaces one source contribution while rejecting cross-source identity collisions. */
export function replaceTrailSourceOwnership(
  ownership: TrailSourceOwnership,
  sourcePath: string,
  incomingEntityIds: readonly string[],
): TrailSourceOwnership {
  const incoming = [...new Set(incomingEntityIds)].sort();
  if (incoming.length !== incomingEntityIds.length) {
    throw new Error(`Source ${sourcePath} contains duplicate Trail entity identities`);
  }

  for (const entityId of incoming) {
    const owner = ownership.sourceByEntityId.get(entityId);
    if (owner !== undefined && owner !== sourcePath) {
      throw new Error(`Duplicate Trail entity identity ${entityId} in ${owner} and ${sourcePath}`);
    }
  }

  const sourceByEntityId = new Map(ownership.sourceByEntityId);
  for (const entityId of ownership.sourceEntityIdsByPath.get(sourcePath) ?? []) {
    sourceByEntityId.delete(entityId);
  }
  for (const entityId of incoming) sourceByEntityId.set(entityId, sourcePath);

  const sourceEntityIdsByPath = new Map(ownership.sourceEntityIdsByPath);
  sourceEntityIdsByPath.set(sourcePath, incoming);
  return { sourceByEntityId, sourceEntityIdsByPath };
}

export function removeTrailSourceOwnership(
  ownership: TrailSourceOwnership,
  sourcePath: string,
): TrailSourceOwnership {
  const sourceByEntityId = new Map(ownership.sourceByEntityId);
  for (const entityId of ownership.sourceEntityIdsByPath.get(sourcePath) ?? []) {
    sourceByEntityId.delete(entityId);
  }
  const sourceEntityIdsByPath = new Map(ownership.sourceEntityIdsByPath);
  sourceEntityIdsByPath.delete(sourcePath);
  return { sourceByEntityId, sourceEntityIdsByPath };
}
