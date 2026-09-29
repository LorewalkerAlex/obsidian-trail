import {
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  type App,
  type ButtonComponent,
  type Plugin,
  type SettingDefinitionItem,
  type SettingDefinitionList,
  type SettingGroupItem,
} from "obsidian";

import type { TrailConfigurationApplication } from "../../application/configuration/trail-configuration-application";
import type { TrailMutationCommandResult } from "../../application/trail-application-support";
import type {
  TrailConfiguration,
  TrailLabel,
  TrailLabelGroup,
  TrailStatusDefinition,
} from "../../domain/model/trail-configuration";
import {
  TRAIL_LABEL_ENTITY_TYPES,
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
import {
  selectTrailStatusOptionGroups,
  type TrailStatusOptionGroup,
} from "../../query/shared/trail-status-query";
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

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function selectionModeLabel(selectionMode: TrailLabelSelectionMode): string {
  return selectionMode === "single" ? "One label" : "Multiple labels";
}

function labelGroupSummary(
  group: TrailLabelGroup,
  labels: readonly TrailLabel[],
): string {
  return [
    selectionModeLabel(group.selectionMode),
    countLabel(group.registeredEntityTypes.length, "entity type"),
    countLabel(labels.length, "label"),
  ].join(" · ");
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
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
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

class TrailNameInputModal extends Modal {
  private submitButton: HTMLButtonElement | null = null;
  private value: string;

  public constructor(
    app: App,
    private readonly title: string,
    private readonly fieldName: string,
    private readonly initialValue: string,
    private readonly placeholder: string,
    private readonly submitLabel: string,
    private readonly onSubmit: (value: string) => void,
  ) {
    super(app);
    this.value = initialValue;
  }

  public onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: this.title });
    new Setting(this.contentEl)
      .setName(this.fieldName)
      .addText((text) => {
        text.setValue(this.value);
        text.setPlaceholder(this.placeholder);
        text.onChange((value) => {
          this.value = value;
          this.updateSubmitAvailability();
        });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" || event.isComposing) return;
          event.preventDefault();
          this.finish();
        });
        text.inputEl.focus();
        text.inputEl.select();
      });

    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    this.submitButton = actions.createEl("button", { text: this.submitLabel });
    this.submitButton.addClass("mod-cta");
    this.submitButton.addEventListener("click", () => this.finish());
    this.updateSubmitAvailability();
  }

  public onClose(): void {
    this.submitButton = null;
    this.contentEl.empty();
  }

  private finish(): void {
    const value = this.value.trim();
    if (!this.canSubmit(value)) return;
    this.onSubmit(value);
    this.close();
  }

  private updateSubmitAvailability(): void {
    if (this.submitButton === null) return;
    this.submitButton.disabled = !this.canSubmit(this.value.trim());
  }

  private canSubmit(value: string): boolean {
    return value !== "" && (this.initialValue === "" || value !== this.initialValue.trim());
  }
}

interface TrailLabelGroupDraft {
  readonly name: string;
  readonly registeredEntityTypes: readonly TrailLabelEntityType[];
  readonly selectionMode: TrailLabelSelectionMode;
}

class TrailLabelGroupCreateModal extends Modal {
  private name = "";
  private readonly registeredEntityTypes = new Set<TrailLabelEntityType>(TRAIL_LABEL_ENTITY_TYPES);
  private selectionMode: TrailLabelSelectionMode = "single";
  private submitButton: HTMLButtonElement | null = null;

  public constructor(
    app: App,
    private readonly onSubmit: (draft: TrailLabelGroupDraft) => void,
  ) {
    super(app);
  }

  public onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "Add label group" });
    new Setting(this.contentEl)
      .setName("Name")
      .setDesc("Examples: Area, technology, context")
      .addText((text) => {
        text.setPlaceholder("Group name");
        text.onChange((value) => {
          this.name = value;
          this.updateSubmitAvailability();
        });
        text.inputEl.focus();
      });
    new Setting(this.contentEl)
      .setName("Selection")
      .setDesc("Choose whether an item may use one or several labels from this group.")
      .addDropdown((dropdown) => {
        dropdown.addOption("single", "One label");
        dropdown.addOption("multiple", "Multiple labels");
        dropdown.setValue(this.selectionMode);
        dropdown.onChange((value) => {
          this.selectionMode = value as TrailLabelSelectionMode;
        });
      });
    for (const entityType of TRAIL_LABEL_ENTITY_TYPES) {
      new Setting(this.contentEl)
        .setName(labelEntityTypeLabel(entityType))
        .setDesc(`Allow this group on ${labelEntityTypeLabel(entityType).toLowerCase()}.`)
        .addToggle((toggle) => {
          toggle.setValue(true);
          toggle.onChange((enabled) => {
            if (enabled) this.registeredEntityTypes.add(entityType);
            else this.registeredEntityTypes.delete(entityType);
          });
        });
    }

    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    this.submitButton = actions.createEl("button", { text: "Create label group" });
    this.submitButton.addClass("mod-cta");
    this.submitButton.addEventListener("click", () => this.finish());
    this.updateSubmitAvailability();
  }

  public onClose(): void {
    this.submitButton = null;
    this.contentEl.empty();
  }

  private finish(): void {
    const name = this.name.trim();
    if (name === "") return;
    this.onSubmit({
      name,
      registeredEntityTypes: [...this.registeredEntityTypes],
      selectionMode: this.selectionMode,
    });
    this.close();
  }

  private updateSubmitAvailability(): void {
    if (this.submitButton === null) return;
    this.submitButton.disabled = this.name.trim() === "";
  }
}

interface TrailLabelDraft {
  readonly groupId: string;
  readonly name: string;
}

class TrailLabelEditModal extends Modal {
  private groupId: string;
  private readonly initialGroupId: string;
  private readonly initialName: string;
  private name: string;
  private submitButton: HTMLButtonElement | null = null;

  public constructor(
    app: App,
    private readonly title: string,
    private readonly groups: readonly TrailLabelGroup[],
    label: TrailLabelDraft,
    private readonly submitLabel: string,
    private readonly onSubmit: (draft: TrailLabelDraft) => void,
  ) {
    super(app);
    this.groupId = label.groupId;
    this.initialGroupId = label.groupId;
    this.initialName = label.name;
    this.name = label.name;
  }

  public onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: this.title });
    new Setting(this.contentEl)
      .setName("Name")
      .addText((text) => {
        text.setValue(this.name);
        text.setPlaceholder("Label name");
        text.onChange((value) => {
          this.name = value;
          this.updateSubmitAvailability();
        });
        text.inputEl.focus();
        text.inputEl.select();
      });
    new Setting(this.contentEl)
      .setName("Label group")
      .addDropdown((dropdown) => {
        for (const group of this.groups) {
          dropdown.addOption(group.id, group.name);
        }
        dropdown.setValue(this.groupId);
        dropdown.onChange((value) => {
          this.groupId = value;
          this.updateSubmitAvailability();
        });
      });

    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    this.submitButton = actions.createEl("button", { text: this.submitLabel });
    this.submitButton.addClass("mod-cta");
    this.submitButton.addEventListener("click", () => this.finish());
    this.updateSubmitAvailability();
  }

  public onClose(): void {
    this.submitButton = null;
    this.contentEl.empty();
  }

  private finish(): void {
    const name = this.name.trim();
    if (!this.canSubmit(name)) return;
    this.onSubmit({ groupId: this.groupId, name });
    this.close();
  }

  private updateSubmitAvailability(): void {
    if (this.submitButton === null) return;
    this.submitButton.disabled = !this.canSubmit(this.name.trim());
  }

  private canSubmit(name: string): boolean {
    return (
      name !== ""
      && this.groupId !== ""
      && (name !== this.initialName.trim() || this.groupId !== this.initialGroupId)
    );
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

    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
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
    const items: SettingDefinitionItem[] = [];

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

    items.push({
      heading: "Configuration",
      items: [
        this.workflowStatusesPage(configuration, writable),
        this.labelsPage(configuration, writable),
      ],
      type: "group",
    });
    return items;
  }

  private workflowStatusesPage(
    configuration: TrailConfiguration,
    writable: boolean,
  ): SettingGroupItem {
    return {
      desc: "Customize the names and order used inside Trail's fixed Issue and Project workflow categories.",
      displayValue: countLabel(configuration.statusDefinitions.length, "status", "statuses"),
      items: [{
        heading: "Entity types",
        items: TRAIL_STATUS_ENTITY_TYPES.map((entityType) => (
          this.statusEntityPage(configuration, entityType, writable)
        )),
        type: "group",
      }],
      name: "Workflow statuses",
      status: writable ? null : "warning",
      type: "page",
    };
  }

  private statusEntityPage(
    configuration: TrailConfiguration,
    entityType: TrailStatusEntityType,
    writable: boolean,
  ): SettingGroupItem {
    const groups = selectTrailStatusOptionGroups(configuration, entityType);
    const statusCount = groups.reduce((count, group) => count + group.definitions.length, 0);
    return {
      desc: `Manage the fixed ${statusEntityTypeLabel(entityType).toLowerCase()} workflow categories.`,
      displayValue: `${countLabel(groups.length, "category", "categories")} · ${countLabel(statusCount, "status", "statuses")}`,
      items: groups.map((group) => (
        this.statusCategoryDefinition(configuration, entityType, group, writable)
      )),
      name: `${statusEntityTypeLabel(entityType)} statuses`,
      type: "page",
    };
  }

  private statusCategoryDefinition(
    configuration: TrailConfiguration,
    entityType: TrailStatusEntityType,
    optionGroup: TrailStatusOptionGroup,
    writable: boolean,
  ): SettingDefinitionList {
    const category = optionGroup.category;
    const definitions = optionGroup.definitions;
    const items = definitions.map((definition) => this.statusDefinitionItem(
      configuration,
      definition,
      optionGroup.defaultId,
      writable,
    ));

    return {
      ...(writable ? {
        addItem: {
          action: () => {
            new TrailNameInputModal(
              this.app,
              `Add ${statusCategoryLabel(category)} status`,
              "Status name",
              "",
              "Status name",
              "Add status",
              (name) => {
                void this.runStatusMutation(() => this.configurationApplication.createStatusDefinition({
                  category,
                  entityType,
                  expectedConfiguration: configuration,
                  name,
                }), "Status created");
              },
            ).open();
          },
          name: `Add status to ${statusCategoryLabel(category)}`,
        },
      } : {}),
      ...(writable && definitions.length > 1 ? {
        onDelete: (index: number) => {
          const definition = definitions[index];
          if (definition === undefined) return;
          this.openStatusDeleteModal(configuration, definition, definitions, optionGroup.defaultId);
        },
        onReorder: (oldIndex: number, newIndex: number) => {
          if (
            oldIndex === newIndex
            || definitions[oldIndex] === undefined
            || definitions[newIndex] === undefined
          ) return;
          const definitionIds = definitions.map(({ id }) => id);
          const [movedId] = definitionIds.splice(oldIndex, 1);
          if (movedId === undefined) return;
          definitionIds.splice(newIndex, 0, movedId);
          void this.runStatusMutation(() => this.configurationApplication.reorderStatusDefinitions({
            category,
            definitionIds,
            entityType,
            expectedConfiguration: configuration,
          }), "Status order saved");
        },
      } : {}),
      heading: statusCategoryLabel(category),
      items,
      type: "list",
    };
  }

  private statusDefinitionItem(
    configuration: TrailConfiguration,
    definition: TrailStatusDefinition,
    defaultId: string,
    writable: boolean,
  ): SettingGroupItem {
    const isDefault = definition.id === defaultId;
    return {
      desc: isDefault ? "Default for category-level actions." : undefined,
      name: definition.name,
      render: (setting) => {
        if (!isDefault) {
          setting.addExtraButton((button) => {
            button.setIcon("star");
            button.setTooltip("Set as category default");
            button.setDisabled(!writable);
            button.onClick(() => {
              void this.runStatusMutation(() => this.configurationApplication.setStatusCategoryDefault({
                category: definition.category,
                entityType: definition.entityType,
                expectedConfiguration: configuration,
                statusDefinitionId: definition.id,
              }), "Status default saved");
            });
          });
        }
        setting.addExtraButton((button) => {
          button.setIcon("pencil");
          button.setTooltip(`Rename ${definition.name}`);
          button.setDisabled(!writable);
          button.onClick(() => {
            new TrailNameInputModal(
              this.app,
              `Rename ${definition.name}`,
              "Status name",
              definition.name,
              "Status name",
              "Save",
              (name) => {
                void this.runStatusMutation(() => this.configurationApplication.renameStatusDefinition({
                  expectedConfiguration: configuration,
                  name,
                  statusDefinitionId: definition.id,
                }), "Status saved");
              },
            ).open();
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

  private labelsPage(
    configuration: TrailConfiguration,
    writable: boolean,
  ): SettingGroupItem {
    return {
      desc: "Manage structured Label Groups and the Labels they own.",
      displayValue: `${countLabel(configuration.labelGroups.length, "group")} · ${countLabel(configuration.labels.length, "label")}`,
      items: [{
        ...(writable ? {
          addItem: {
            action: () => {
              new TrailLabelGroupCreateModal(this.app, (draft) => {
                void this.runLabelMutation(() => this.configurationApplication.createLabelGroup({
                  expectedConfiguration: configuration,
                  name: draft.name,
                  registeredEntityTypes: draft.registeredEntityTypes,
                  selectionMode: draft.selectionMode,
                }), "Label group created");
              }).open();
            },
            name: "Add label group",
          },
        } : {}),
        emptyState: "No label groups yet.",
        heading: "Label groups",
        items: configuration.labelGroups.map((group) => (
          this.labelGroupPage(configuration, group, writable)
        )),
        type: "list",
      }],
      name: "Labels",
      status: writable ? null : "warning",
      type: "page",
    };
  }

  private labelGroupPage(
    configuration: TrailConfiguration,
    group: TrailLabelGroup,
    writable: boolean,
  ): SettingGroupItem {
    const labels = configuration.labels.filter(({ groupId }) => groupId === group.id);
    return {
      desc: "Manage this Group's selection rule, availability, and Labels.",
      displayValue: labelGroupSummary(group, labels),
      items: [
        this.labelGroupSettingsDefinition(configuration, group, writable),
        this.labelListDefinition(configuration, group, labels, writable),
        this.labelGroupDangerDefinition(configuration, group, writable),
      ],
      name: group.name,
      type: "page",
    };
  }

  private labelGroupSettingsDefinition(
    configuration: TrailConfiguration,
    group: TrailLabelGroup,
    writable: boolean,
  ): SettingDefinitionItem {
    let name = group.name;
    let selectionMode = group.selectionMode;
    const registeredEntityTypes = new Set<TrailLabelEntityType>(group.registeredEntityTypes);
    let saveButton: ButtonComponent | null = null;
    const updateSaveAvailability = (): void => {
      if (saveButton === null) return;
      const sameEntityTypes = (
        registeredEntityTypes.size === group.registeredEntityTypes.length
        && group.registeredEntityTypes.every((entityType) => registeredEntityTypes.has(entityType))
      );
      saveButton.setDisabled(
        !writable
        || name.trim() === ""
        || (
          name.trim() === group.name
          && selectionMode === group.selectionMode
          && sameEntityTypes
        ),
      );
    };
    const items: SettingGroupItem[] = [
      {
        name: "Group name",
        render: (setting) => {
          setting.addText((text) => {
            text.setValue(group.name);
            text.setDisabled(!writable);
            text.onChange((value) => {
              name = value;
              updateSaveAvailability();
            });
          });
        },
      },
      {
        desc: "Choose whether an item may use one or several Labels from this Group.",
        name: "Selection",
        render: (setting) => {
          setting.addDropdown((dropdown) => {
            dropdown.addOption("single", "One label");
            dropdown.addOption("multiple", "Multiple labels");
            dropdown.setValue(group.selectionMode);
            dropdown.setDisabled(!writable);
            dropdown.onChange((value) => {
              selectionMode = value as TrailLabelSelectionMode;
              updateSaveAvailability();
            });
          });
        },
      },
    ];

    for (const entityType of TRAIL_LABEL_ENTITY_TYPES) {
      items.push({
        desc: `Allow this Group on ${labelEntityTypeLabel(entityType).toLowerCase()}.`,
        name: labelEntityTypeLabel(entityType),
        render: (setting) => {
          setting.addToggle((toggle) => {
            toggle.setValue(registeredEntityTypes.has(entityType));
            toggle.setDisabled(!writable);
            toggle.onChange((enabled) => {
              if (enabled) registeredEntityTypes.add(entityType);
              else registeredEntityTypes.delete(entityType);
              updateSaveAvailability();
            });
          });
        },
      });
    }

    items.push({
      desc: "Apply the Group name, selection mode, and entity availability above. Trail asks before clearing selections that become invalid.",
      name: "Save group changes",
      render: (setting) => {
        setting.addButton((button) => {
          saveButton = button;
          button.setButtonText("Save group");
          button.setCta();
          updateSaveAvailability();
          button.onClick(() => {
            const trimmedName = name.trim();
            void this.runLabelMutation(
              () => this.configurationApplication.editLabelGroup({
                expectedConfiguration: configuration,
                groupId: group.id,
                name: trimmedName,
                registeredEntityTypes: [...registeredEntityTypes],
                selectionMode,
              }),
              "Label group saved",
              () => this.configurationApplication.editLabelGroup({
                clearInvalidSelections: true,
                expectedConfiguration: configuration,
                groupId: group.id,
                name: trimmedName,
                registeredEntityTypes: [...registeredEntityTypes],
                selectionMode,
              }),
            );
          });
        });
      },
    });

    return {
      heading: "Group",
      items,
      type: "group",
    };
  }

  private labelListDefinition(
    configuration: TrailConfiguration,
    group: TrailLabelGroup,
    labels: readonly TrailLabel[],
    writable: boolean,
  ): SettingDefinitionList {
    return {
      ...(writable ? {
        addItem: {
          action: () => {
            new TrailNameInputModal(
              this.app,
              `Add label to ${group.name}`,
              "Label name",
              "",
              "Label name",
              "Add label",
              (name) => {
                void this.runLabelMutation(() => this.configurationApplication.createLabel({
                  expectedConfiguration: configuration,
                  groupId: group.id,
                  name,
                }), "Label created");
              },
            ).open();
          },
          name: `Add label to ${group.name}`,
        },
        onDelete: (index: number) => {
          const label = labels[index];
          if (label === undefined) return;
          this.deleteLabel(configuration, label);
        },
      } : {}),
      emptyState: "No labels in this Group yet.",
      heading: "Labels",
      items: labels.map((label) => this.labelDefinition(configuration, label, writable)),
      type: "list",
    };
  }

  private labelDefinition(
    configuration: TrailConfiguration,
    label: TrailLabel,
    writable: boolean,
  ): SettingGroupItem {
    return {
      name: label.name,
      render: (setting) => {
        setting.addExtraButton((button) => {
          button.setIcon("pencil");
          button.setTooltip(`Edit ${label.name}`);
          button.setDisabled(!writable);
          button.onClick(() => {
            new TrailLabelEditModal(
              this.app,
              `Edit ${label.name}`,
              configuration.labelGroups,
              label,
              "Save",
              (draft) => {
                void this.runLabelMutation(
                  () => this.configurationApplication.editLabel({
                    expectedConfiguration: configuration,
                    groupId: draft.groupId,
                    labelId: label.id,
                    name: draft.name,
                  }),
                  "Label saved",
                  () => this.configurationApplication.editLabel({
                    clearInvalidSelections: true,
                    expectedConfiguration: configuration,
                    groupId: draft.groupId,
                    labelId: label.id,
                    name: draft.name,
                  }),
                );
              },
            ).open();
          });
        });
      },
    };
  }

  private deleteLabel(configuration: TrailConfiguration, label: TrailLabel): void {
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
  }

  private labelGroupDangerDefinition(
    configuration: TrailConfiguration,
    group: TrailLabelGroup,
    writable: boolean,
  ): SettingDefinitionItem {
    return {
      heading: "Danger zone",
      items: [{
        desc: "Remove this Group and all Labels it owns. Work items are preserved; Trail asks before clearing affected selections.",
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
      }],
      type: "group",
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
