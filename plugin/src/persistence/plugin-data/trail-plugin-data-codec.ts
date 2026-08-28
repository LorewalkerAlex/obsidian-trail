import type {
  TrailConfiguration,
  TrailLabel,
  TrailLabelGroup,
  TrailStatusCategoryConfiguration,
  TrailStatusDefinition,
  TrailWorkflowStatusConfiguration,
} from "../../domain/model/trail-configuration";
import {
  TRAIL_LABEL_ENTITY_TYPES,
  TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE,
  type TrailLabelEntityType,
  type TrailProjectId,
  type TrailStatusCategory,
  type TrailStatusEntityType,
} from "../../domain/model/trail-values";
import type {
  TrailCustomViewConfig,
  TrailFavoriteReference,
  TrailSavedViewSelectionSpec,
  TrailWorkspaceState,
} from "../../domain/model/trail-workspace-state";
import {
  validateTrailConfiguration,
  validateTrailWorkspaceState,
  validateTrailWorkspaceStateContents,
} from "../../domain/validation/trail-configuration-validation";
import {
  isTrailId,
  isTrailLabelEntityType,
  isTrailLabelSelectionMode,
  isTrailPlainObject,
} from "../../domain/validation/trail-value-validation";

export type TrailPersistedWorkspaceState = Omit<TrailWorkspaceState, "defaultProjectId"> & {
  readonly defaultProjectId?: TrailProjectId;
};

export interface TrailPersistedPluginDataSnapshot {
  readonly configuration: TrailConfiguration;
  readonly workspaceState: TrailPersistedWorkspaceState;
}

export interface TrailPluginDataSnapshot {
  readonly configuration: TrailConfiguration;
  readonly workspaceState: TrailWorkspaceState;
}

export interface TrailPluginDataIssue {
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly scope: "configuration" | "plugin-data" | "workspace";
  readonly severity: "error";
  readonly stage: "domain" | "field" | "physical" | "reference" | "workspace";
}

export type TrailPluginDataCodecResult =
  | { readonly ok: true; readonly value: TrailPersistedPluginDataSnapshot }
  | { readonly issues: readonly TrailPluginDataIssue[]; readonly ok: false };

export function isTrailPluginDataSnapshot(
  snapshot: TrailPersistedPluginDataSnapshot,
): snapshot is TrailPluginDataSnapshot {
  return snapshot.workspaceState.defaultProjectId !== undefined;
}

function scopeForPath(path: string): TrailPluginDataIssue["scope"] {
  if (path.startsWith("$.configuration")) return "configuration";
  if (path.startsWith("$.workspaceState")) return "workspace";
  return "plugin-data";
}

function codecIssue(
  code: string,
  path: string,
  message: string,
  options: {
    readonly scope?: TrailPluginDataIssue["scope"];
    readonly stage?: TrailPluginDataIssue["stage"];
  } = {},
): TrailPluginDataIssue {
  return {
    code,
    message,
    path,
    scope: options.scope ?? scopeForPath(path),
    severity: "error",
    stage: options.stage ?? "physical",
  };
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isTrailPlainObject(value)) return false;
  return Object.values(value).every((entry) => isJsonValue(entry));
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  issues: TrailPluginDataIssue[],
): boolean {
  const allowed = new Set([...required, ...optional]);
  let valid = true;
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      issues.push(codecIssue("plugin-data.key.missing", path, `Missing required key: ${key}`));
      valid = false;
    }
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(codecIssue("plugin-data.key.unknown", path, `Unknown key: ${key}`));
      valid = false;
    }
  }
  return valid;
}

function objectAt(
  value: unknown,
  path: string,
  issues: TrailPluginDataIssue[],
): Record<string, unknown> | undefined {
  if (!isTrailPlainObject(value)) {
    issues.push(codecIssue("plugin-data.object.invalid", path, "Expected an object"));
    return undefined;
  }
  return value;
}

function arrayAt(
  value: unknown,
  path: string,
  issues: TrailPluginDataIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    issues.push(codecIssue("plugin-data.array.invalid", path, "Expected an array"));
    return undefined;
  }
  const entries: unknown[] = [];
  for (const entry of value as readonly unknown[]) {
    entries.push(entry);
  }
  return entries;
}

function nonEmptyTextAt(
  value: unknown,
  path: string,
  issues: TrailPluginDataIssue[],
): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(codecIssue(
      "plugin-data.text.invalid",
      path,
      "Expected non-empty text",
      { stage: "field" },
    ));
    return undefined;
  }
  return value;
}

function idAt(value: unknown, path: string, issues: TrailPluginDataIssue[]): string | undefined {
  if (!isTrailId(value)) {
    issues.push(codecIssue(
      "plugin-data.id.invalid",
      path,
      "Expected a non-empty ID",
      { stage: "field" },
    ));
    return undefined;
  }
  return value;
}

function parseStatusCategory(
  value: unknown,
  entityType: TrailStatusEntityType,
  category: TrailStatusCategory,
  path: string,
  issues: TrailPluginDataIssue[],
  definitions: TrailStatusDefinition[],
): TrailStatusCategoryConfiguration | undefined {
  const object = objectAt(value, path, issues);
  if (object === undefined) return undefined;
  exactKeys(object, ["defaultId", "definitions"], [], path, issues);
  const defaultId = idAt(object.defaultId, `${path}.defaultId`, issues);
  const physicalDefinitions = arrayAt(object.definitions, `${path}.definitions`, issues);
  if (defaultId === undefined || physicalDefinitions === undefined) return undefined;

  const definitionIds: string[] = [];
  physicalDefinitions.forEach((entry, index) => {
    const definitionPath = `${path}.definitions[${index}]`;
    const definitionObject = objectAt(entry, definitionPath, issues);
    if (definitionObject === undefined) return;
    exactKeys(definitionObject, ["id", "name"], [], definitionPath, issues);
    const id = idAt(definitionObject.id, `${definitionPath}.id`, issues);
    const name = nonEmptyTextAt(definitionObject.name, `${definitionPath}.name`, issues);
    if (id === undefined || name === undefined) return;
    definitionIds.push(id);
    definitions.push({ category, entityType, id, name });
  });
  return { defaultId, definitionIds };
}

function parseEntityStatuses(
  value: unknown,
  entityType: TrailStatusEntityType,
  categories: readonly TrailStatusCategory[],
  path: string,
  issues: TrailPluginDataIssue[],
  definitions: TrailStatusDefinition[],
): Readonly<Record<string, TrailStatusCategoryConfiguration>> | undefined {
  const object = objectAt(value, path, issues);
  if (object === undefined) return undefined;
  exactKeys(object, categories, [], path, issues);
  const result: Record<string, TrailStatusCategoryConfiguration> = {};
  for (const category of categories) {
    const parsed = parseStatusCategory(
      object[category],
      entityType,
      category,
      `${path}.${category}`,
      issues,
      definitions,
    );
    if (parsed !== undefined) result[category] = parsed;
  }
  return categories.every((category) => result[category] !== undefined)
    ? result
    : undefined;
}

function parseConfiguration(
  value: unknown,
  path: string,
  issues: TrailPluginDataIssue[],
): TrailConfiguration | undefined {
  const object = objectAt(value, path, issues);
  if (object === undefined) return undefined;
  exactKeys(object, ["statuses", "labels", "cycle", "temporal"], [], path, issues);

  const statuses = objectAt(object.statuses, `${path}.statuses`, issues);
  const definitions: TrailStatusDefinition[] = [];
  let issueStatuses: TrailWorkflowStatusConfiguration["issue"] | undefined;
  let projectStatuses: TrailWorkflowStatusConfiguration["project"] | undefined;
  if (statuses !== undefined) {
    exactKeys(statuses, ["issue", "project"], [], `${path}.statuses`, issues);
    issueStatuses = parseEntityStatuses(
      statuses.issue,
      "issue",
      TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.issue,
      `${path}.statuses.issue`,
      issues,
      definitions,
    );
    projectStatuses = parseEntityStatuses(
      statuses.project,
      "project",
      TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.project,
      `${path}.statuses.project`,
      issues,
      definitions,
    );
  }

  const labelsObject = objectAt(object.labels, `${path}.labels`, issues);
  const labelGroups: TrailLabelGroup[] = [];
  const labels: TrailLabel[] = [];
  if (labelsObject !== undefined) {
    exactKeys(labelsObject, ["groups", "definitions"], [], `${path}.labels`, issues);
    const groups = arrayAt(labelsObject.groups, `${path}.labels.groups`, issues);
    groups?.forEach((entry, index) => {
      const groupPath = `${path}.labels.groups[${index}]`;
      const groupObject = objectAt(entry, groupPath, issues);
      if (groupObject === undefined) return;
      exactKeys(groupObject, ["id", "name", "selectionMode", "registeredEntityTypes"], [], groupPath, issues);
      const id = idAt(groupObject.id, `${groupPath}.id`, issues);
      const name = nonEmptyTextAt(groupObject.name, `${groupPath}.name`, issues);
      const registered = arrayAt(groupObject.registeredEntityTypes, `${groupPath}.registeredEntityTypes`, issues);
      const registeredEntityTypes: TrailLabelEntityType[] = [];
      const registeredSeen = new Set<TrailLabelEntityType>();
      registered?.forEach((entityType, entityIndex) => {
        if (!isTrailLabelEntityType(entityType)) {
          issues.push(codecIssue(
            "plugin-data.label-group.entity-type.invalid",
            `${groupPath}.registeredEntityTypes[${entityIndex}]`,
            "Unsupported LabelGroup entity type",
            { stage: "field" },
          ));
        } else if (registeredSeen.has(entityType)) {
          issues.push(codecIssue(
            "plugin-data.label-group.entity-type.duplicate",
            `${groupPath}.registeredEntityTypes[${entityIndex}]`,
            `Duplicate LabelGroup entity type: ${entityType}`,
            { stage: "field" },
          ));
        } else {
          registeredSeen.add(entityType);
          registeredEntityTypes.push(entityType);
        }
      });
      if (!isTrailLabelSelectionMode(groupObject.selectionMode)) {
        issues.push(codecIssue(
          "plugin-data.label-group.selection.invalid",
          `${groupPath}.selectionMode`,
          "Unsupported LabelGroup selection mode",
          { stage: "field" },
        ));
      }
      if (id !== undefined && name !== undefined && isTrailLabelSelectionMode(groupObject.selectionMode) && registered !== undefined) {
        labelGroups.push({
          id,
          name,
          registeredEntityTypes: TRAIL_LABEL_ENTITY_TYPES.filter((entityType) => registeredEntityTypes.includes(entityType)),
          selectionMode: groupObject.selectionMode,
        });
      }
    });

    const physicalLabels = arrayAt(labelsObject.definitions, `${path}.labels.definitions`, issues);
    physicalLabels?.forEach((entry, index) => {
      const labelPath = `${path}.labels.definitions[${index}]`;
      const labelObject = objectAt(entry, labelPath, issues);
      if (labelObject === undefined) return;
      exactKeys(labelObject, ["id", "name", "groupId"], [], labelPath, issues);
      const id = idAt(labelObject.id, `${labelPath}.id`, issues);
      const name = nonEmptyTextAt(labelObject.name, `${labelPath}.name`, issues);
      const groupId = idAt(labelObject.groupId, `${labelPath}.groupId`, issues);
      if (id !== undefined && name !== undefined && groupId !== undefined) labels.push({ groupId, id, name });
    });
  }

  const cycleObject = objectAt(object.cycle, `${path}.cycle`, issues);
  let defaultEndRule: "end-of-next-week" | undefined;
  if (cycleObject !== undefined) {
    exactKeys(cycleObject, ["defaultEndRule"], [], `${path}.cycle`, issues);
    if (cycleObject.defaultEndRule !== "end-of-next-week") {
      issues.push(codecIssue(
        "plugin-data.cycle.default-end-rule.invalid",
        `${path}.cycle.defaultEndRule`,
        "Unsupported Cycle default end rule",
        { stage: "field" },
      ));
    } else {
      defaultEndRule = "end-of-next-week";
    }
  }

  const temporalObject = objectAt(object.temporal, `${path}.temporal`, issues);
  let timezone: string | undefined;
  const temporalFormats: { dateFormat?: string; timeFormat?: string; dateTimeFormat?: string } = {};
  if (temporalObject !== undefined) {
    exactKeys(temporalObject, ["timezone"], ["dateFormat", "timeFormat", "dateTimeFormat"], `${path}.temporal`, issues);
    timezone = nonEmptyTextAt(temporalObject.timezone, `${path}.temporal.timezone`, issues);
    for (const key of ["dateFormat", "timeFormat", "dateTimeFormat"] as const) {
      if (temporalObject[key] !== undefined) {
        const format = nonEmptyTextAt(temporalObject[key], `${path}.temporal.${key}`, issues);
        if (format !== undefined) temporalFormats[key] = format;
      }
    }
  }

  if (
    issueStatuses === undefined
    || projectStatuses === undefined
    || labelsObject === undefined
    || defaultEndRule === undefined
    || timezone === undefined
  ) return undefined;

  const configuration: TrailConfiguration = {
    cycle: { defaultEndRule },
    labelGroups,
    labels,
    statusDefinitions: definitions,
    temporal: { timezone, ...temporalFormats },
    workflowStatuses: { issue: issueStatuses, project: projectStatuses },
  };
  for (const domainIssue of validateTrailConfiguration(configuration)) {
    issues.push(codecIssue(
      `plugin-data.configuration.${domainIssue.code}`,
      path,
      domainIssue.message,
      { scope: "configuration", stage: "reference" },
    ));
  }
  return configuration;
}

function parseSelection(
  value: unknown,
  path: string,
  issues: TrailPluginDataIssue[],
): TrailSavedViewSelectionSpec | undefined {
  const object = objectAt(value, path, issues);
  if (object === undefined) return undefined;
  exactKeys(object, ["entityType"], ["scope", "filters", "sort", "group"], path, issues);
  const entityType = nonEmptyTextAt(object.entityType, `${path}.entityType`, issues);
  for (const key of ["scope", "filters", "sort", "group"] as const) {
    if (object[key] !== undefined && !isJsonValue(object[key])) {
      issues.push(codecIssue(
        "plugin-data.custom-view.selection.invalid-json",
        `${path}.${key}`,
        `${key} must be JSON-serializable`,
        { scope: "workspace", stage: "field" },
      ));
    }
  }
  if (entityType === undefined) return undefined;
  const selection: {
    entityType: string;
    filters?: unknown;
    group?: unknown;
    scope?: unknown;
    sort?: unknown;
  } = { entityType };
  for (const key of ["scope", "filters", "sort", "group"] as const) {
    if (object[key] !== undefined) selection[key] = object[key];
  }
  return selection;
}

function parseWorkspaceState(
  value: unknown,
  path: string,
  issues: TrailPluginDataIssue[],
): TrailPersistedWorkspaceState | undefined {
  const object = objectAt(value, path, issues);
  if (object === undefined) return undefined;
  exactKeys(object, ["customViews", "favorites", "home"], ["defaultProjectId"], path, issues);

  const customViewsPhysical = arrayAt(object.customViews, `${path}.customViews`, issues);
  const customViews: TrailCustomViewConfig[] = [];
  customViewsPhysical?.forEach((entry, index) => {
    const viewPath = `${path}.customViews[${index}]`;
    const viewObject = objectAt(entry, viewPath, issues);
    if (viewObject === undefined) return;
    exactKeys(viewObject, ["id", "name", "selection", "presentation"], [], viewPath, issues);
    const id = idAt(viewObject.id, `${viewPath}.id`, issues);
    const name = nonEmptyTextAt(viewObject.name, `${viewPath}.name`, issues);
    const selection = parseSelection(viewObject.selection, `${viewPath}.selection`, issues);
    const presentation = objectAt(viewObject.presentation, `${viewPath}.presentation`, issues);
    if (presentation !== undefined && !isJsonValue(presentation)) {
      issues.push(codecIssue(
        "plugin-data.custom-view.presentation.invalid-json",
        `${viewPath}.presentation`,
        "presentation must be JSON-serializable",
        { scope: "workspace", stage: "field" },
      ));
    }
    if (id !== undefined && name !== undefined && selection !== undefined && presentation !== undefined) {
      customViews.push({ id, name, presentation, selection });
    }
  });

  const defaultProjectId = object.defaultProjectId === undefined
    ? undefined
    : idAt(object.defaultProjectId, `${path}.defaultProjectId`, issues);

  const favoritesPhysical = arrayAt(object.favorites, `${path}.favorites`, issues);
  const favorites: TrailFavoriteReference[] = [];
  favoritesPhysical?.forEach((entry, index) => {
    const favoritePath = `${path}.favorites[${index}]`;
    const favoriteObject = objectAt(entry, favoritePath, issues);
    if (favoriteObject === undefined) return;
    exactKeys(favoriteObject, ["targetType", "targetId"], [], favoritePath, issues);
    const targetType = nonEmptyTextAt(favoriteObject.targetType, `${favoritePath}.targetType`, issues);
    const targetId = idAt(favoriteObject.targetId, `${favoritePath}.targetId`, issues);
    if (targetType !== undefined && targetId !== undefined) favorites.push({ targetId, targetType });
  });

  const home = objectAt(object.home, `${path}.home`, issues);
  if (home !== undefined && !isJsonValue(home)) {
    issues.push(codecIssue(
      "plugin-data.home.invalid-json",
      `${path}.home`,
      "home must be JSON-serializable",
      { scope: "workspace", stage: "field" },
    ));
  }
  if (customViewsPhysical === undefined || favoritesPhysical === undefined || home === undefined) return undefined;
  const workspaceState: TrailPersistedWorkspaceState = {
    customViews,
    ...(defaultProjectId === undefined ? {} : { defaultProjectId }),
    favorites,
    home,
  };
  for (const domainIssue of validateTrailWorkspaceStateContents(workspaceState)) {
    issues.push(codecIssue(
      `plugin-data.workspace.${domainIssue.code}`,
      path,
      domainIssue.message,
      { scope: "workspace", stage: "workspace" },
    ));
  }
  return workspaceState;
}

export function parseTrailPluginData(value: unknown): TrailPluginDataCodecResult {
  const issues: TrailPluginDataIssue[] = [];
  const root = objectAt(value, "$", issues);
  if (root === undefined) return { issues, ok: false };
  exactKeys(root, ["configuration", "workspaceState"], [], "$", issues);
  const configuration = parseConfiguration(root.configuration, "$.configuration", issues);
  const workspaceState = parseWorkspaceState(root.workspaceState, "$.workspaceState", issues);
  if (configuration === undefined || workspaceState === undefined || issues.length > 0) {
    return { issues, ok: false };
  }
  return { ok: true, value: { configuration, workspaceState } };
}

function definitionMap(configuration: TrailConfiguration): ReadonlyMap<string, TrailStatusDefinition> {
  return new Map(configuration.statusDefinitions.map((definition) => [definition.id, definition]));
}

function serializeEntityStatuses(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
  categories: readonly TrailStatusCategory[],
  statuses: Readonly<Record<string, TrailStatusCategoryConfiguration>>,
): Record<string, unknown> {
  const definitions = definitionMap(configuration);
  const result: Record<string, unknown> = {};
  for (const category of categories) {
    const categoryConfig = statuses[category];
    if (categoryConfig === undefined) {
      throw new Error(`Missing ${entityType} Status Category during plugin-data serialization: ${category}`);
    }
    result[category] = {
      defaultId: categoryConfig.defaultId,
      definitions: categoryConfig.definitionIds.map((id) => {
        const definition = definitions.get(id);
        if (definition === undefined || definition.entityType !== entityType || definition.category !== category) {
          throw new Error(`Invalid StatusDefinition reference during plugin-data serialization: ${id}`);
        }
        return { id: definition.id, name: definition.name };
      }),
    };
  }
  return result;
}

function serializeSelection(selection: TrailSavedViewSelectionSpec): Record<string, unknown> {
  const result: Record<string, unknown> = { entityType: selection.entityType };
  for (const key of ["scope", "filters", "sort", "group"] as const) {
    if (selection[key] !== undefined) result[key] = selection[key];
  }
  return result;
}

/** Converts canonical ready logical state to the current physical data.json shape. */
export function serializeTrailPluginData(snapshot: TrailPluginDataSnapshot): unknown {
  const configurationIssues = validateTrailConfiguration(snapshot.configuration);
  const workspaceIssues = validateTrailWorkspaceState(snapshot.workspaceState);
  if (configurationIssues.length > 0 || workspaceIssues.length > 0) {
    throw new Error([
      ...configurationIssues.map((item) => item.message),
      ...workspaceIssues.map((item) => item.message),
    ].join("; "));
  }

  const physical = {
    configuration: {
      statuses: {
        issue: serializeEntityStatuses(
          snapshot.configuration,
          "issue",
          TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.issue,
          snapshot.configuration.workflowStatuses.issue,
        ),
        project: serializeEntityStatuses(
          snapshot.configuration,
          "project",
          TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.project,
          snapshot.configuration.workflowStatuses.project,
        ),
      },
      labels: {
        groups: [...snapshot.configuration.labelGroups]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((group) => ({
            id: group.id,
            name: group.name,
            selectionMode: group.selectionMode,
            registeredEntityTypes: TRAIL_LABEL_ENTITY_TYPES.filter((entityType) =>
              group.registeredEntityTypes.includes(entityType)),
          })),
        definitions: [...snapshot.configuration.labels]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((label) => ({ id: label.id, name: label.name, groupId: label.groupId })),
      },
      cycle: { defaultEndRule: snapshot.configuration.cycle.defaultEndRule },
      temporal: {
        timezone: snapshot.configuration.temporal.timezone,
        ...(snapshot.configuration.temporal.dateFormat === undefined
          ? {}
          : { dateFormat: snapshot.configuration.temporal.dateFormat }),
        ...(snapshot.configuration.temporal.timeFormat === undefined
          ? {}
          : { timeFormat: snapshot.configuration.temporal.timeFormat }),
        ...(snapshot.configuration.temporal.dateTimeFormat === undefined
          ? {}
          : { dateTimeFormat: snapshot.configuration.temporal.dateTimeFormat }),
      },
    },
    workspaceState: {
      customViews: [...snapshot.workspaceState.customViews]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((view) => ({
          id: view.id,
          name: view.name,
          selection: serializeSelection(view.selection),
          presentation: view.presentation,
        })),
      defaultProjectId: snapshot.workspaceState.defaultProjectId,
      favorites: snapshot.workspaceState.favorites.map((favorite) => ({
        targetType: favorite.targetType,
        targetId: favorite.targetId,
      })),
      home: snapshot.workspaceState.home,
    },
  };
  if (!isJsonValue(physical)) {
    throw new Error("Trail plugin data contains a non-JSON-serializable workspace value");
  }
  return physical;
}
