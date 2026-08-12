import {
  executeTrailCrossFileMutation,
} from "./trail-cross-file-mutation";
import type {
  TrailFleetingNote,
  TrailFleetingNoteStorage,
  TrailStoredFleetingNote,
} from "./trail-model";
import {
  createActiveFleetingNoteInVault,
  createStoredFleetingNoteInVault,
  type TrailFleetingNoteLifecycleSource,
} from "./trail-fleeting-note-lifecycle-service";
import {
  removeFleetingNoteInVault,
  type TrailMutableFile,
} from "./trail-mutation-service";

export interface TrailStoreFleetingNoteCommandInput {
  expectedNote: TrailFleetingNote;
  storage: TrailFleetingNoteStorage;
  storedAt: string;
}

export async function storeFleetingNoteInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailFleetingNoteLifecycleSource<FileType>,
  {
    expectedNote,
    storage,
    storedAt,
  }: TrailStoreFleetingNoteCommandInput,
): Promise<TrailStoredFleetingNote> {
  return executeTrailCrossFileMutation({
    createTarget: () => createStoredFleetingNoteInVault(
      source,
      {
        expectedNote,
        storage,
        storedAt,
      },
    ),
    removeSource: () => removeFleetingNoteInVault(
      source,
      { expectedNote },
    ),
    compensateTarget: (storedNote) =>
      removeFleetingNoteInVault(
        source,
        { expectedNote: storedNote },
      ),
  });
}

export interface TrailRestoreFleetingNoteCommandInput {
  expectedNote: TrailStoredFleetingNote;
}

export async function restoreFleetingNoteInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailFleetingNoteLifecycleSource<FileType>,
  {
    expectedNote,
  }: TrailRestoreFleetingNoteCommandInput,
): Promise<TrailFleetingNote> {
  return executeTrailCrossFileMutation({
    createTarget: () => createActiveFleetingNoteInVault(
      source,
      { expectedNote },
    ),
    removeSource: () => removeFleetingNoteInVault(
      source,
      { expectedNote },
    ),
    compensateTarget: (restoredNote) =>
      removeFleetingNoteInVault(
        source,
        { expectedNote: restoredNote },
      ),
  });
}
