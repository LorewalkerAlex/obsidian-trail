import type {
  TrailFleetingNote,
  TrailTask,
} from "./trail-model";
import {
  executeTrailCrossFileMutation,
} from "./trail-cross-file-mutation";
import {
  createBacklogTaskInVault,
  removeCreatedTaskInVault,
  removeFleetingNoteInVault,
  type TrailMutableFile,
  type TrailMutationSource,
} from "./trail-mutation-service";

export interface TrailFleetingToTaskCommandInput {
  expectedNote: TrailFleetingNote;
  targetProjectId: string;
  targetProjectPath: string;
  taskId: string;
  taskCreatedAt: string;
}

export async function convertFleetingNoteToTaskInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailMutationSource<FileType>,
  {
    expectedNote,
    targetProjectId,
    targetProjectPath,
    taskId,
    taskCreatedAt,
  }: TrailFleetingToTaskCommandInput,
): Promise<TrailTask> {
  return executeTrailCrossFileMutation({
    createTarget: () => createBacklogTaskInVault(
      source,
      {
        projectId: targetProjectId,
        projectPath: targetProjectPath,
        task: {
          id: taskId,
          title: expectedNote.text,
          created: taskCreatedAt,
        },
      },
    ),
    removeSource: () => removeFleetingNoteInVault(
      source,
      { expectedNote },
    ),
    compensateTarget: (createdTask) =>
      removeCreatedTaskInVault(
        source,
        { expectedTask: createdTask },
      ),
  });
}
