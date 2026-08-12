import {
  executeTrailCrossFileMutation,
} from "./trail-cross-file-mutation";
import type {
  TrailArea,
  TrailFleetingNote,
  TrailProject,
} from "./trail-model";
import {
  createProjectInVault,
  removeCreatedProjectInVault,
  type TrailProjectCreationSource,
} from "./trail-project-creation-service";
import {
  removeFleetingNoteInVault,
  type TrailMutableFile,
} from "./trail-mutation-service";

export interface TrailFleetingToProjectCommandInput {
  expectedNote: TrailFleetingNote;
  targetArea: TrailArea;
  projectId: string;
  projectName: string;
  projectCreatedOn: string;
}

export async function convertFleetingNoteToProjectInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailProjectCreationSource<FileType>,
  {
    expectedNote,
    targetArea,
    projectId,
    projectName,
    projectCreatedOn,
  }: TrailFleetingToProjectCommandInput,
): Promise<TrailProject> {
  const createdProject = await executeTrailCrossFileMutation({
    createTarget: () => createProjectInVault(
      source,
      {
        area: targetArea,
        project: {
          id: projectId,
          name: projectName,
          created: projectCreatedOn,
          overview: expectedNote.text,
        },
      },
    ),
    removeSource: () => removeFleetingNoteInVault(
      source,
      { expectedNote },
    ),
    compensateTarget: (target) =>
      removeCreatedProjectInVault(
        source,
        { expectedProject: target },
      ),
  });

  return createdProject.project;
}
