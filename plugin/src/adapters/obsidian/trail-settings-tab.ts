import {
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  type App,
  type Plugin,
  type SettingDefinitionItem,
  type SettingGroupItem,
} from "obsidian";

import type { TrailConfigurationApplication } from "../../application/configuration/trail-configuration-application";
import type { TrailMutationCommandResult } from "../../application/trail-application-support";
import type {
  TrailConfiguration,
  TrailStatusDefinition,
} from "../../domain/model/trail-configuration";
import {
  TRAIL_LABEL_ENTITY_TYPES,
  TRAIL_STATUS_CATEGORIES,
  TRAIL_STATUS_ENTITY_TYPES,
  type TrailLabelEntityType,
  type TrailLabelSelectionMode,
  type TrailStatusCategory,
  type TrailStatusEntityType,
} from "../../domain/model/trail-values";
import {
  selectTrailReadableConfiguration,
  selectTrailReadableEntityIdsByStatusDefinition,
} from "../../query/shared/trail-effective-query";
import { selectTrailStatusOptionGroups } from "../../query/shared/trail-status-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function labelEntityTypeLabel(entityType: TrailLabelEntityType): string {
  switch (entityType) {
    case "initiative": return "Initiatives";
    case "project": return "Projects";
    case "issue": return "Issues";
  }
}

function statusEntityTypeLabel(entityType: TrailStatusEntityType): string {
  return entityType === "issue" ? "Issue" : "Project";
}

function statusCategoryLabel(category: TrailStatusCategory): string {
  switch (category) {
    case "backlog": return "Backlog";
    case "unstarted": return "Unstarted";
    case "started": return "Started";
    case "completed": return "Completed";
    case "canceled": return "Canceled";
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

interface TrailStatusDeleteChoices {
  readonly newDefaultStatusDefinitionId?: string;
  readonly replacementStatusDefinitionId?: string;
}

class TrailStatusDeleteModal extends Modal {
  private confirmButton: HTMLButtonElement | null = null;
  private newDefaultStatusDefinitionId: string | undefined;
  private replacementStatusDefinitionId: string | undefined;

  public constructor(
    app: App,
    private readonly definition: TrailStatusDefinition,
    private readonly remainingDefinitions: readonly TrailStatusDefinition[],
    private readonly requiresNewDefault: boolean,
    private readonly affectedReferenceCount: number,
    private readonly confirmDelete: (choices: TrailStatusDeleteChoices) => void,
  ) {
    super(app);
  }

  public onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: `Delete ${this.definition.name}?` });
    this.contentEl.createEl("p", {
      text: "This removes the status definition. Existing work items are preserved and can only be moved to another status in the same fixed category.",
    });

    if (this.requiresNewDefault) {
      new Setting(this.contentEl)
        .setName("New category default")
        .setDesc("Choose which remaining status future category-level actions should use.")
        .addDropdown((dropdown) => {
          dropdown.addOption("", "Choose a status");
          for (const definition of this.remainingDefinitions) {
            dropdown.addOption(definition.id, definition.name);
          }
          dropdown.setValue("");
          dropdown.onChange((value) => {
            this.newDefaultStatusDefinitionId = value === "" ? undefined : value;
            this.updateConfirmAvailability();
          });
        });
    }

    if (this.affectedReferenceCount > 0) {
      new Setting(this.contentEl)
        .setName("Replace existing references")
        .setDesc(
          `Choose the status for ${this.affectedReferenceCount} current ${statusEntityTypeLabel(this.definition.entityType).toLowerCase()} reference(s).`,
        )
        .addDropdown((dropdown) => {
          dropdown.addOption("", "Choose a status");
          for (const definition of this.remainingDefinitions) {
            dropdown.addOption(definition.id, definition.name);
          }
          dropdown.setValue("");
          dropdown.onChange((value) => {
            this.replacementStatusDefinitionId = value === "" ? undefined : value;
            this.updateConfirmAvailability();
          });
        });
    }

    const actions = this.contentEl.createDiv();
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    this.confirmButton = actions.createEl("button", { text: "Delete status" });
    this.confirmButton.addClass("mod-warning");
    this.confirmButton.addEventListener("click", () => {
      if (this.confirmButton?.disabled === true) return;
      this.confirmDelete({
        newDefaultStatusDefinitionId: this.newDefaultStatusDefinitionId,
        replacementStatusDefinitionId: this.replacementStatusDefinitionId,
      });
      this.close();
    });
    this.updateConfirmAvailability();
  }

  public onClose(): void {
    this.confirmButton = null;
    this.contentEl.empty();
  }

  private updateConfirmAvailability(): void {
    if (this.confirmButton === null) return;
    this.confirmButton.disabled = (
      (this.requiresNewDefault && this.newDefaultStatusDefinitionId === undefined)
      || (this.affectedReferenceCount > 0 && this.replacementStatusDefinitionId === undefined)
    );
  }
}

function confirmTrailSettingsChange(app: App, title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    new TrailSettingsConfirmationModal(app, title, message, resolve).open();
  });
}

/** Obsidian-native Workspace Configuration surface for Trail workflow Statuses and Labels. */
export class TrailSettingsTab extends PluginSettingTab {
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
        heading: "Statuses",
        items: [{
          desc: "Issue and project workflows keep fixed semantic categories. Customize the named statuses inside each category.",
          name: "Workflow statuses",
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
          desc: `Trail is currently ${runtime.control.kind}; configuration changes are temporarily disabled.`,
          name: "Configuration editing",
        }],
        type: "group",
      });
    }

    for (const entityType of TRAIL_STATUS_ENTITY_TYPES) {
      for (const category of TRAIL_STATUS_CATEGORIES) {
        items.push(this.statusCategoryDefinition(configuration, entityType, category, writable));
      }
    }

    items.push({
      heading: "Labels",
      items: [{
        desc: "Label groups define structured workspace classification. Single groups allow one label per item; multiple groups allow several.",
        name: "Structured labels",
      }],
      type: "group",
    });
    items.push(this.createGroupDefinition(configuration, writable));
    for (const group of configuration.labelGroups) {
      items.push(this.groupDefinition(configuration, group.id, writable));
    }
    return items;
  }

  private statusCategoryDefinition(
    configuration: TrailConfiguration,
    entityType: TrailStatusEntityType,
    category: TrailStatusCategory,
    writable: boolean,
  ): SettingDefinitionItem {
    const optionGroup = selectTrailStatusOptionGroups(configuration, entityType)
      .find((group) => group.category === category);
    const definitions = optionGroup?.definitions ?? [];
    const categoryConfiguration = configuration.workflowStatuses[entityType][category];
    const items = definitions.map((definition, index) => this.statusDefinitionItem(
      configuration,
      definition,
      definitions,
      categoryConfiguration.defaultId,
      index,
      writable,
    ));

    let newStatusName = "";
    items.push({
      name: "Add status",
      render: (setting) => {
        setting
          .addText((text) => {
            text.setPlaceholder("Status name");
            text.setDisabled(!writable);
            text.onChange((value) => {
              newStatusName = value;
            });
          })
          .addButton((button) => {
            button.setButtonText("Add");
            button.setDisabled(!writable);
            button.onClick(() => {
              void this.runStatusMutation(() => this.configurationApplication.createStatusDefinition({
                category,
                entityType,
                expectedConfiguration: configuration,
                name: newStatusName,
              }), "Status created");
            });
          });
      },
    });

    return {
      heading: `${statusEntityTypeLabel(entityType)} statuses · ${statusCategoryLabel(category)}`,
      items,
      type: "group",
    };
  }

  private statusDefinitionItem(
    configuration: TrailConfiguration,
    definition: TrailStatusDefinition,
    definitions: readonly TrailStatusDefinition[],
    defaultId: string,
    index: number,
    writable: boolean,
  ): SettingGroupItem {
    let name = definition.name;
    const isDefault = definition.id === defaultId;
    return {
      desc: isDefault ? "Default for category-level actions." : undefined,
      name: definition.name,
      render: (setting) => {
        setting
          .addText((text) => {
            text.setValue(definition.name);
            text.setDisabled(!writable);
            text.onChange((value) => {
              name = value;
            });
          })
          .addButton((button) => {
            button.setButtonText("Save");
            button.setDisabled(!writable);
            button.onClick(() => {
              void this.runStatusMutation(() => this.configurationApplication.renameStatusDefinition({
                expectedConfiguration: configuration,
                name,
                statusDefinitionId: definition.id,
              }), "Status saved");
            });
          })
          .addButton((button) => {
            button.setButtonText("Move up");
            button.setDisabled(!writable || index === 0);
            button.onClick(() => {
              if (index === 0) return;
              const definitionIds = definitions.map(({ id }) => id);
              [definitionIds[index - 1], definitionIds[index]] = [
                definitionIds[index],
                definitionIds[index - 1],
              ];
              void this.runStatusMutation(() => this.configurationApplication.reorderStatusDefinitions({
                category: definition.category,
                definitionIds,
                entityType: definition.entityType,
                expectedConfiguration: configuration,
              }), "Status order saved");
            });
          })
          .addButton((button) => {
            button.setButtonText("Move down");
            button.setDisabled(!writable || index >= definitions.length - 1);
            button.onClick(() => {
              if (index >= definitions.length - 1) return;
              const definitionIds = definitions.map(({ id }) => id);
              [definitionIds[index], definitionIds[index + 1]] = [
                definitionIds[index + 1],
                definitionIds[index],
              ];
              void this.runStatusMutation(() => this.configurationApplication.reorderStatusDefinitions({
                category: definition.category,
                definitionIds,
                entityType: definition.entityType,
                expectedConfiguration: configuration,
              }), "Status order saved");
            });
          })
          .addButton((button) => {
            button.setButtonText(isDefault ? "Default" : "Set default");
            button.setDisabled(!writable || isDefault);
            button.onClick(() => {
              if (isDefault) return;
              void this.runStatusMutation(() => this.configurationApplication.setStatusCategoryDefault({
                category: definition.category,
                entityType: definition.entityType,
                expectedConfiguration: configuration,
                statusDefinitionId: definition.id,
              }), "Status default saved");
            });
          })
          .addButton((button) => {
            button.setButtonText("Delete");
            button.setDestructive();
            button.setDisabled(!writable);
            button.onClick(() => {
              this.openStatusDeleteModal(configuration, definition, definitions, defaultId);
            });
          });
      },
    };
  }

  private openStatusDeleteModal(
    configuration: TrailConfiguration,
    definition: TrailStatusDefinition,
    definitions: readonly TrailStatusDefinition[],
    defaultId: string,
  ): void {
    const remainingDefinitions = definitions.filter(({ id }) => id !== definition.id);
    if (remainingDefinitions.length === 0) {
      new Notice("Each fixed status category must keep at least one status.");
      return;
    }
    const affectedReferenceCount = selectTrailReadableEntityIdsByStatusDefinition(
      this.runtimeStore.getState(),
      definition.id,
    ).length;
    new TrailStatusDeleteModal(
      this.app,
      definition,
      remainingDefinitions,
      definition.id === defaultId,
      affectedReferenceCount,
      (choices) => {
        void this.runStatusMutation(() => this.configurationApplication.deleteStatusDefinition({
          expectedConfiguration: configuration,
          newDefaultStatusDefinitionId: choices.newDefaultStatusDefinitionId,
          replacementStatusDefinitionId: choices.replacementStatusDefinitionId,
          statusDefinitionId: definition.id,
        }), "Status deleted");
      },
    ).open();
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
        desc: `Allow this group on ${labelEntityTypeLabel(entityType).toLowerCase()}.`,
        name: labelEntityTypeLabel(entityType),
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
            void this.runLabelMutation(() => this.configurationApplication.createLabelGroup({
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
        name: labelEntityTypeLabel(entityType),
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
            void this.runLabelMutation(
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
            void this.confirmDeleteAndRunLabelMutation(
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
              void this.runLabelMutation(() => this.configurationApplication.createLabel({
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
              void this.runLabelMutation(
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
              void this.confirmDeleteAndRunLabelMutation(
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

  private async confirmDeleteAndRunLabelMutation(
    title: string,
    message: string,
    action: () => TrailMutationCommandResult,
    cleanupAction: () => TrailMutationCommandResult,
    successMessage: string,
  ): Promise<void> {
    const confirmed = await confirmTrailSettingsChange(this.app, title, message);
    if (!confirmed) return;
    await this.runLabelMutation(action, successMessage, cleanupAction);
  }

  private async runStatusMutation(
    action: () => TrailMutationCommandResult,
    successMessage: string,
  ): Promise<void> {
    try {
      const result = action();
      if (result.kind === "needs-input") {
        new Notice(result.input.message);
        return;
      }
      if (result.kind === "unchanged") {
        new Notice("No Trail status changes to save.");
        return;
      }
      await result.receipt.completion;
      new Notice(successMessage);
      this.update();
    } catch (error: unknown) {
      new Notice(`Trail status change failed: ${errorMessage(error)}`);
    }
  }

  private async runLabelMutation(
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
