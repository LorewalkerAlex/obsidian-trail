import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, type WorkspaceLeaf } from "obsidian";

import type {
  TrailArea,
  TrailFleetingNote,
  TrailProject,
  TrailStoredFleetingNote,
  TrailTask,
  TrailTaskStatus,
} from "./domain/trail-model";
import type { TrailRuntimeStore } from "./domain/trail-runtime-store";
import { TrailApp } from "./trail-app";

export const TRAIL_VIEW_TYPE = "trail-view";
export type TrailTaskStatusUpdater = (
  task: TrailTask,
  targetStatus: TrailTaskStatus,
) => Promise<void>;

export type TrailFleetingNoteProjectConverter = (
  note: TrailFleetingNote,
  area: TrailArea,
  projectName: string,
) => Promise<void>;

export type TrailFleetingNoteConverter = (
  note: TrailFleetingNote,
  project: TrailProject,
) => Promise<void>;

export type TrailFleetingNoteAction = (
  note: TrailFleetingNote,
) => Promise<void>;

export type TrailStoredFleetingNoteRestorer = (
  note: TrailStoredFleetingNote,
) => Promise<void>;

export class TrailView extends ItemView {
  private root: Root | null = null;
  private unsubscribe: (() => void) | null = null;
  constructor(
    leaf: WorkspaceLeaf,
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly updateTaskStatus: TrailTaskStatusUpdater,
    private readonly convertFleetingNoteToProject:
      TrailFleetingNoteProjectConverter,
    private readonly convertFleetingNoteToTask:
      TrailFleetingNoteConverter,
    private readonly archiveFleetingNote:
      TrailFleetingNoteAction,
    private readonly deleteFleetingNote:
      TrailFleetingNoteAction,
    private readonly restoreFleetingNote:
      TrailStoredFleetingNoteRestorer,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return TRAIL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Trail";
  }

  getIcon(): string {
    return "route";
  }
  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("trail-view");

    const mountElement = this.contentEl.createDiv({
      cls: "trail-view__root",
    });

    this.root = createRoot(mountElement);
    this.unsubscribe = this.runtimeStore.subscribe(
      this.renderSnapshot,
    );

    this.renderSnapshot();
    await this.runtimeStore.initialize();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.unmount();
    this.root = null;

    this.contentEl.empty();
  }

  private readonly handleUpdateTaskStatus = async (
    task: TrailTask,
    targetStatus: TrailTaskStatus,
  ): Promise<void> => {
    await this.updateTaskStatus(task, targetStatus);
  };

  private readonly handleConvertFleetingNoteToProject = async (
    note: TrailFleetingNote,
    area: TrailArea,
    projectName: string,
  ): Promise<void> => {
    await this.convertFleetingNoteToProject(
      note,
      area,
      projectName,
    );
  };

  private readonly handleConvertFleetingNoteToTask = async (
    note: TrailFleetingNote,
    project: TrailProject,
  ): Promise<void> => {
    await this.convertFleetingNoteToTask(note, project);
  };

  private readonly handleArchiveFleetingNote = async (
    note: TrailFleetingNote,
  ): Promise<void> => {
    await this.archiveFleetingNote(note);
  };

  private readonly handleDeleteFleetingNote = async (
    note: TrailFleetingNote,
  ): Promise<void> => {
    await this.deleteFleetingNote(note);
  };

  private readonly handleRestoreFleetingNote = async (
    note: TrailStoredFleetingNote,
  ): Promise<void> => {
    await this.restoreFleetingNote(note);
  };
  private readonly renderSnapshot = (): void => {
    const snapshot = this.runtimeStore.getSnapshot();

    if (!snapshot.isInitialized) {
      return;
    }

    this.root?.render(
      <StrictMode>
        <TrailApp
          data={snapshot.data}
          onUpdateTaskStatus={this.handleUpdateTaskStatus}
          onConvertFleetingNoteToProject={
            this.handleConvertFleetingNoteToProject
          }
          onConvertFleetingNoteToTask={
            this.handleConvertFleetingNoteToTask
          }
          onArchiveFleetingNote={
            this.handleArchiveFleetingNote
          }
          onDeleteFleetingNote={
            this.handleDeleteFleetingNote
          }
          onRestoreFleetingNote={
            this.handleRestoreFleetingNote
          }
        />
      </StrictMode>,
    );
  };
}
