import {
  FuzzySuggestModal,
  Notice,
  type App,
  type Plugin,
  type SettingDefinitionItem,
} from "obsidian";

import type { TrailConfigurationApplication } from "../../application/configuration/trail-configuration-application";
import type { TrailWorkspaceApplication } from "../../application/workspace/trail-workspace-application";
import {
  selectTrailDefaultProjectSettingsReadModel,
  type TrailDefaultProjectOption,
} from "../../query/projects/trail-default-project-settings-query";
import type { TrailRuntimeState, TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailSettingsTab } from "./trail-settings-tab";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function defaultProjectSignature(state: TrailRuntimeState): string | null {
  const model = selectTrailDefaultProjectSettingsReadModel(state);
  return model === null ? null : JSON.stringify(model);
}

class TrailDefaultProjectSuggestModal extends FuzzySuggestModal<TrailDefaultProjectOption> {
  public constructor(
    app: App,
    private readonly projects: readonly TrailDefaultProjectOption[],
    private readonly onChoose: (projectId: string) => void,
  ) {
    super(app);
    this.modalEl.addClass("trail-action-target-suggest");
    this.modalEl.addClass("trail-default-project-suggest");
    this.setPlaceholder("Search projects");
  }

  public getItems(): TrailDefaultProjectOption[] {
    return [...this.projects];
  }

  public getItemText(project: TrailDefaultProjectOption): string {
    return project.title;
  }

  public onChooseItem(project: TrailDefaultProjectOption): void {
    this.onChoose(project.id);
  }
}

/** Adds Workspace-level settings without moving Configuration ownership out of TrailSettingsTab. */
export class TrailWorkspaceSettingsTab extends TrailSettingsTab {
  public constructor(
    app: App,
    plugin: Plugin,
    private readonly workspaceRuntimeStore: TrailRuntimeStore,
    configurationApplication: TrailConfigurationApplication,
    private readonly workspaceApplication: TrailWorkspaceApplication,
  ) {
    super(app, plugin, workspaceRuntimeStore, configurationApplication);
    plugin.register(workspaceRuntimeStore.subscribe((state, previousState) => {
      if (
        state.control.kind !== previousState.control.kind
        || defaultProjectSignature(state) !== defaultProjectSignature(previousState)
      ) {
        this.update();
      }
    }));
  }

  public override getSettingDefinitions(): SettingDefinitionItem[] {
    const runtime = this.workspaceRuntimeStore.getState();
    const model = selectTrailDefaultProjectSettingsReadModel(runtime);
    const writable = runtime.control.kind === "ready" && model !== null;
    const currentProject = model?.projects.find(({ id }) => id === model.currentProjectId);

    const workspaceGroup: SettingDefinitionItem = {
      heading: "Workspace",
      items: [{
        desc: model === null
          ? "Trail workspace state is not available yet."
          : `Current: ${currentProject?.title ?? "Unknown project"}. Used when Trail needs an explicit default project. Changing this reference does not move existing issues.`,
        name: "Default project",
        render: (setting) => {
          if (model === null) return;
          setting.addButton((button) => {
            button
              .setButtonText("Change")
              .setDisabled(!writable)
              .setTooltip("Change default project")
              .onClick(() => {
                new TrailDefaultProjectSuggestModal(
                  this.app,
                  model.projects,
                  (projectId) => {
                    void this.changeDefaultProject(projectId);
                  },
                ).open();
              });
          });
        },
      }],
      type: "group",
    };

    return [workspaceGroup, ...super.getSettingDefinitions()];
  }

  private async changeDefaultProject(projectId: string): Promise<void> {
    try {
      const result = this.workspaceApplication.setDefaultProject(projectId);
      if (result.kind === "unchanged") return;
      if (result.kind === "needs-input") {
        new Notice("Default project change requires additional input.");
        return;
      }
      await result.receipt.completion;
      new Notice("Default project saved");
    } catch (error: unknown) {
      new Notice(`Default project could not be changed: ${errorMessage(error)}`);
    }
  }
}
