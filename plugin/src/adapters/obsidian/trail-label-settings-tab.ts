import {
  Modal,
  Notice,
  PluginSettingTab,
  type App,
  type Plugin,
  type SettingDefinitionItem,
  type SettingGroupItem,
} from "obsidian";

import type { TrailConfigurationApplication } from "../../application/configuration/trail-configuration-application";
import type { TrailMutationCommandResult } from "../../application/trail-application-support";
import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import {
  TRAIL_LABEL_ENTITY_TYPES,
  type TrailLabelEntityType,
  type TrailLabelSelectionMode,
} from "../../domain/model/trail-values";
import { selectTrailReadableConfiguration } from "../../query/shared/trail-effective-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function entityTypeLabel(entityType: TrailLabelEntityType): string {
  switch (entityType) {
    case "initiative": return "Initiatives";
    case "project": return "Projects";
    case "issue": return "Issues";
  }
}

class TrailSettingsConfirmationModal extends Modal {
  private settled = false;

  public constructor(
    app: App,
    private readonly title: string,
    private readonly message: string,
    private readonly resolveResult: (confirmed: boolean) => void,
  ) {
    super(app);
  }

  public onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: this.title });
    this.contentEl.createEl("p", { text: this.message });
    const actions = this.contentEl.createDiv();
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.finish(false));
    const confirm = actions.createEl("button", { text: "Continue" });
    confirm.addClass("mod-warning");
    confirm.addEventListener("click", () => this.finish(true));
  }

  public onClose(): void {
    this.contentEl.empty();
    if (!this.settled) {
      this.settled = true;
      this.resolveResult(false);
    }
  }

  private finish(confirmed: boolean): void {
    if (this.settled) return;
    this.settled = true;
    this.resolveResult(confirmed);
    this.close();
  }
}

function confirmTrailSettingsChange(app: App, title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    new TrailSettingsConfirmationModal(app, title, message, resolve).open();
  });
}

/** Obsidian-native Workspace Configuration surface for structured Trail Labels. */
export class TrailLabelSettingsTab extends PluginSettingTab {
  public constructor(
    app: App,
    plugin: Plugin,
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly configurationApplication: TrailConfigurationApplication,
  ) {
    super(app, plugin);
    plugin.register(runtimeStore.subscribe((state, previousState) => {
      const configuration = selectTrailReadableConfiguration(state);
      const previousConfiguration = selectTrailReadableConfiguration(previousState);
      if (
        configuration !== previousConfiguration
        || state.control.kind !== previousState.control.kind
      ) {
        this.update();
      }
    }));
  }

  public getSettingDefinitions(): SettingDefinitionItem[] {
    const runtime = this.runtimeStore.getState();
    const configuration = selectTrailReadableConfiguration(runtime);
    const items: SettingDefinitionItem[] = [
      {
        heading: "Labels",
        items: [{
          desc: "Label groups define structured workspace classification. Single groups allow one label per item; multiple groups allow several.",
          name: "Structured labels",
        }],
        type: "group",
      },
    ];

    if (configuration === null) {
      items.push({
        heading: "Availability",
        items: [{
          desc: "Trail configuration is not available yet.",
          name: "Trail configuration",
        }],
        type: "group",
      });
      return items;
    }

    const writable = runtime.control.kind === "ready";
    if (!writable) {
      items.push({
        heading: "Availability",
        items: [{
          desc: `Trail is currently ${runtime.control.kind}; label changes are temporarily disabled.`,
          name: "Label editing",
        }],
        type: "group",
      });
    }

    items.push(this.createGroupDefinition(configuration, writable));
    for (const group of configuration.labelGroups) {
      items.push(this.groupDefinition(configuration, group.id, writable));
    }
    return items;
  }

  private createGroupDefinition(
    configuration: TrailConfiguration,
    writable: boolean,
  ): SettingDefinitionItem {
    let name = "";
    let selectionMode: TrailLabelSelectionMode = "single";
    const registeredEntityTypes = new Set<TrailLabelEntityType>(TRAIL_LABEL_ENTITY_TYPES);
    const items: SettingGroupItem[] = [
      {
        desc: "Examples: Area, technology, context",
        name: "Name",
        render: (setting) => {
          setting.addText((text) => {
            text.setDisabled(!writable);
            text.onChange((value) => {
              name = value;
            });
          });
        },
      },
      {
        desc: "Single permits one label from this group; multiple permits several.",
        name: "Selection",
        render: (setting) => {
          setting.addDropdown((dropdown) => {
            dropdown.addOption("single", "Single");
            dropdown.addOption("multiple", "Multiple");
            dropdown.setValue(selectionMode);
            dropdown.setDisabled(!writable);
            dropdown.onChange((value) => {
              selectionMode = value as TrailLabelSelectionMode;
            });
          });
        },
      },
    ];

    for (const entityType of TRAIL_LABEL_ENTITY_TYPES) {
      items.push({
        desc: `Allow this group on ${entityTypeLabel(entityType).toLowerCase()}.`,
        name: entityTypeLabel(entityType),
        render: (setting) => {
          setting.addToggle((toggle) => {
            toggle.setValue(true);
            toggle.setDisabled(!writable);
            toggle.onChange((enabled) => {
              if (enabled) registeredEntityTypes.add(entityType);
              else registeredEntityTypes.delete(entityType);
            });
          });
        },
      });
    }

    items.push({
      name: "Create label group",
      render: (setting) => {
        setting.addButton((button) => {
          button.setButtonText("Create label group");
          button.setCta();
          button.setDisabled(!writable);
          button.onClick(() => {
            void this.runMutation(() => this.configurationApplication.createLabelGroup({
              expectedConfiguration: configuration,
              name,
              registeredEntityTypes: [...registeredEntityTypes],
              selectionMode,
            }), "Label group created");
          });
        });
      },
    });

    return {
      heading: "Add label group",
      items,
      type: "group",
    };
  }

  private groupDefinition(
    configuration: TrailConfiguration,
    groupId: string,
    writable: boolean,
  ): SettingDefinitionItem {
    const group = configuration.labelGroups.find(({ id }) => id === groupId);
    if (group === undefined) {
      return {
        heading: "Labels",
        items: [],
        type: "group",
      };
    }

    let name = group.name;
    let selectionMode = group.selectionMode;
    const registeredEntityTypes = new Set<TrailLabelEntityType>(group.registeredEntityTypes);
    const items: SettingGroupItem[] = [
      {
        name: "Group name",
        render: (setting) => {
          setting.addText((text) => {
            text.setValue(group.name);
            text.setDisabled(!writable);
            text.onChange((value) => {
              name = value;
            });
          });
        },
      },
      {
        name: "Selection",
        render: (setting) => {
          setting.addDropdown((dropdown) => {
            dropdown.addOption("single", "Single");
            dropdown.addOption("multiple", "Multiple");
            dropdown.setValue(group.selectionMode);
            dropdown.setDisabled(!writable);
            dropdown.onChange((value) => {
              selectionMode = value as TrailLabelSelectionMode;
            });
          });
        },
      },
    ];

    for (const entityType of TRAIL_LABEL_ENTITY_TYPES) {
      items.push({
        name: entityTypeLabel(entityType),
        render: (setting) => {
          setting.addToggle((toggle) => {
            toggle.setValue(registeredEntityTypes.has(entityType));
            toggle.setDisabled(!writable);
            toggle.onChange((enabled) => {
              if (enabled) registeredEntityTypes.add(entityType);
              else registeredEntityTypes.delete(entityType);
            });
          });
        },
      });
    }

    items.push({
      desc: "Apply the group name, selection mode, and entity availability above. If existing selections become invalid, Trail asks before clearing them.",
      name: "Save group changes",
      render: (setting) => {
        setting.addButton((button) => {
          button.setButtonText("Save group");
          button.setCta();
          button.setDisabled(!writable);
          button.onClick(() => {
            void this.runMutation(
              () => this.configurationApplication.editLabelGroup({
                expectedConfiguration: configuration,
                groupId: group.id,
                name,
                registeredEntityTypes: [...registeredEntityTypes],
                selectionMode,
              }),
              "Label group saved",
              () => this.configurationApplication.editLabelGroup({
                clearInvalidSelections: true,
                expectedConfiguration: configuration,
                groupId: group.id,
                name,
                registeredEntityTypes: [...registeredEntityTypes],
                selectionMode,
              }),
            );
          });
        });
      },
    });

    items.push({
      desc: "Remove this group and all Label definitions it owns. Work items are preserved; Trail asks before clearing affected selections.",
      name: "Delete label group",
      render: (setting) => {
        setting.addButton((button) => {
          button.setButtonText("Delete group");
          button.setDestructive();
          button.setDisabled(!writable);
          button.onClick(() => {
            void this.confirmDeleteAndRun(
              `Delete ${group.name}?`,
              "The label group and its labels will be removed. Existing work items are preserved; any now-invalid label selections require explicit cleanup confirmation.",
              () => this.configurationApplication.deleteLabelGroup({
                expectedConfiguration: configuration,
                groupId: group.id,
              }),
              () => this.configurationApplication.deleteLabelGroup({
                clearInvalidSelections: true,
                expectedConfiguration: configuration,
                groupId: group.id,
              }),
              "Label group deleted",
            );
          });
        });
      },
    });

    for (const label of configuration.labels.filter(({ groupId: ownerId }) => ownerId === group.id)) {
      items.push(this.labelDefinition(configuration, label.id, writable));
    }

    let newLabelName = "";
    items.push({
      name: "Add label",
      render: (setting) => {
        setting
          .addText((text) => {
            text.setPlaceholder("Label name");
            text.setDisabled(!writable);
            text.onChange((value) => {
              newLabelName = value;
            });
          })
          .addButton((button) => {
            button.setButtonText("Add");
            button.setDisabled(!writable);
            button.onClick(() => {
              void this.runMutation(() => this.configurationApplication.createLabel({
                expectedConfiguration: configuration,
                groupId: group.id,
                name: newLabelName,
              }), "Label created");
            });
          });
      },
    });

    return {
      heading: group.name,
      items,
      type: "group",
    };
  }

  private labelDefinition(
    configuration: TrailConfiguration,
    labelId: string,
    writable: boolean,
  ): SettingGroupItem {
    const label = configuration.labels.find(({ id }) => id === labelId);
    if (label === undefined) {
      return { name: "Unavailable label" };
    }

    let name = label.name;
    let groupId = label.groupId;
    return {
      name: label.name,
      render: (setting) => {
        setting
          .addText((text) => {
            text.setValue(label.name);
            text.setDisabled(!writable);
            text.onChange((value) => {
              name = value;
            });
          })
          .addDropdown((dropdown) => {
            for (const group of configuration.labelGroups) {
              dropdown.addOption(group.id, group.name);
            }
            dropdown.setValue(label.groupId);
            dropdown.setDisabled(!writable);
            dropdown.onChange((value) => {
              groupId = value;
            });
          })
          .addButton((button) => {
            button.setButtonText("Save");
            button.setDisabled(!writable);
            button.onClick(() => {
              void this.runMutation(
                () => this.configurationApplication.editLabel({
                  expectedConfiguration: configuration,
                  groupId,
                  labelId: label.id,
                  name,
                }),
                "Label saved",
                () => this.configurationApplication.editLabel({
                  clearInvalidSelections: true,
                  expectedConfiguration: configuration,
                  groupId,
                  labelId: label.id,
                  name,
                }),
              );
            });
          })
          .addButton((button) => {
            button.setButtonText("Delete");
            button.setDestructive();
            button.setDisabled(!writable);
            button.onClick(() => {
              void this.confirmDeleteAndRun(
                `Delete ${label.name}?`,
                "The label definition will be removed. Existing work items are preserved; any now-invalid label selections require explicit cleanup confirmation.",
                () => this.configurationApplication.deleteLabel({
                  expectedConfiguration: configuration,
                  labelId: label.id,
                }),
                () => this.configurationApplication.deleteLabel({
                  clearInvalidSelections: true,
                  expectedConfiguration: configuration,
                  labelId: label.id,
                }),
                "Label deleted",
              );
            });
          });
      },
    };
  }

  private async confirmDeleteAndRun(
    title: string,
    message: string,
    action: () => TrailMutationCommandResult,
    cleanupAction: () => TrailMutationCommandResult,
    successMessage: string,
  ): Promise<void> {
    const confirmed = await confirmTrailSettingsChange(this.app, title, message);
    if (!confirmed) return;
    await this.runMutation(action, successMessage, cleanupAction);
  }

  private async runMutation(
    action: () => TrailMutationCommandResult,
    successMessage: string,
    cleanupAction?: () => TrailMutationCommandResult,
  ): Promise<void> {
    try {
      let result = action();
      if (result.kind === "needs-input") {
        if (cleanupAction === undefined) {
          new Notice(result.input.message);
          return;
        }
        const confirmed = await confirmTrailSettingsChange(
          this.app,
          "Resolve label references?",
          `${result.input.message} Trail can clear only the label selections that become invalid; the work items themselves are preserved.`,
        );
        if (!confirmed) return;
        result = cleanupAction();
        if (result.kind === "needs-input") {
          new Notice(result.input.message);
          return;
        }
      }

      if (result.kind === "unchanged") {
        new Notice("No Trail label changes to save.");
        return;
      }

      await result.receipt.completion;
      new Notice(successMessage);
      this.update();
    } catch (error: unknown) {
      new Notice(`Trail label change failed: ${errorMessage(error)}`);
    }
  }
}
