export interface TrailSourceOwnership {
  readonly sourceByEntityId: Readonly<Record<string, string>>;
  readonly sourceEntityIdsByPath: Readonly<Record<string, readonly string[]>>;
}

/** Replaces one source's logical ownership while rejecting cross-source ID collisions. */
export function replaceTrailSourceOwnership(
  ownership: TrailSourceOwnership,
  filePath: string,
  incomingEntityIds: readonly string[],
): TrailSourceOwnership {
  for (const entityId of incomingEntityIds) {
    const owner = ownership.sourceByEntityId[entityId];
    if (owner !== undefined && owner !== filePath) {
      throw new Error(
        `Duplicate Trail entity identity ${entityId} in ${owner} and ${filePath}`,
      );
    }
  }

  const sourceByEntityId = { ...ownership.sourceByEntityId };
  const previousEntityIds = ownership.sourceEntityIdsByPath[filePath] ?? [];
  for (const entityId of previousEntityIds) {
    delete sourceByEntityId[entityId];
  }
  for (const entityId of incomingEntityIds) {
    sourceByEntityId[entityId] = filePath;
  }

  return {
    sourceByEntityId,
    sourceEntityIdsByPath: {
      ...ownership.sourceEntityIdsByPath,
      [filePath]: incomingEntityIds.slice().sort(),
    },
  };
}

export function removeTrailSourceOwnership(
  ownership: TrailSourceOwnership,
  filePath: string,
): TrailSourceOwnership {
  const sourceByEntityId = { ...ownership.sourceByEntityId };
  for (const entityId of ownership.sourceEntityIdsByPath[filePath] ?? []) {
    delete sourceByEntityId[entityId];
  }
  const sourceEntityIdsByPath = { ...ownership.sourceEntityIdsByPath };
  delete sourceEntityIdsByPath[filePath];
  return { sourceByEntityId, sourceEntityIdsByPath };
}
