import {
  StrictMode,
  createRef,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { Modal, type App } from "obsidian";

import type { TrailTask } from "./domain/trail-model";
import {
  TrailTaskTitleEditor,
  type TrailTaskTitleEditorHandle,
} from "./trail-task-title-editor";

export type TrailTaskTitleSaver = (
  task: TrailTask,
  title: string,
) => Promise<void>;

export class TrailTaskTitleModal extends Modal {
  private root: Root | null = null;
  private readonly editorRef =
    createRef<TrailTaskTitleEditorHandle>();
  private bypassCloseGuard = false;

  constructor(
    app: App,
    private readonly task: TrailTask,
    private readonly saveTitle: TrailTaskTitleSaver,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.setTitle("Task details");
    const mountElement = this.contentEl.createDiv({
      cls: "trail-task-title-modal__root",
    });

    const root = createRoot(mountElement);
    this.root = root;
    root.render(
      <StrictMode>
        <TrailTaskTitleEditor
          ref={this.editorRef}
          task={this.task}
          onSave={this.saveTitle}
          onClose={() => this.closeWithoutGuard()}
        />
      </StrictMode>,
    );
  }

  override close(): void {
    if (this.bypassCloseGuard || !this.editorRef.current) {
      super.close();
      return;
    }

    this.editorRef.current.requestClose();
  }

  override onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }

  private closeWithoutGuard(): void {
    this.bypassCloseGuard = true;

    try {
      super.close();
    } finally {
      this.bypassCloseGuard = false;
    }
  }
}
