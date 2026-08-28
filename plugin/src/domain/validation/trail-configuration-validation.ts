import type {
  TrailConfiguration,
  TrailStatusCategoryConfiguration,
} from "../model/trail-configuration";
import {
  TRAIL_ESTIMATES,
  TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE,
  isTrailStatusCategoryForEntityType,
  type TrailStatusCategory,
} from "../model/trail-values";
import type { TrailWorkspaceState } from "../model/trail-workspace-state";
import {
  isTrailEstimateWeight,
  isTrailId,
  isTrailLabelEntityType,
  isTrailLabelSelectionMode,
  isTrailPlainObject,
  isTrailStatusCategory,
  isTrailStatusEntityType,
} from "./trail-value-validation";
import type { TrailDomainValidationIssue } from "./trail-record-validation";

function issue(code: string, message: string, field?: string): TrailDomainValidationIssue {
  return { code, field, message };
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function validateTrailConfiguration(
  configuration: TrailConfiguration,
): readonly TrailDomainValidationIssue[] {
  const issues: TrailDomainValidationIssue[] = [];
  const definitionsById = new Map<string, (typeof configuration.statusDefinitions)[number]>();

  for (const definition of configuration.statusDefinitions) {
    if (!isTrailId(definition.id)) issues.push(issue("status.id.invalid", "StatusDefinition id must be non-empty", "statusDefinitions"));
    if (!nonEmptyText(definition.name)) issues.push(issue("status.name.invalid", "StatusDefinition name must be non-empty", "statusDefinitions"));
    if (!isTrailStatusEntityType(definition.entityType)) issues.push(issue("status.entity-type.invalid", "StatusDefinition entityType is invalid", "statusDefinitions"));
    if (!isTrailStatusCategory(definition.category)) {
      issues.push(issue("status.category.invalid", "StatusDefinition category is invalid", "statusDefinitions"));
    } else if (
      isTrailStatusEntityType(definition.entityType)
      && !isTrailStatusCategoryForEntityType(definition.entityType, definition.category)
    ) {
      issues.push(issue(
        "status.category.unsupported",
        `Status Category ${definition.category} is not supported for ${definition.entityType}`,
        "statusDefinitions",
      ));
    }
    if (definitionsById.has(definition.id)) issues.push(issue("status.id.duplicate", `Duplicate StatusDefinition ID: ${definition.id}`, "statusDefinitions"));
    definitionsById.set(definition.id, definition);
  }

  const referencedStatusIds = new Set<string>();
  for (const entityType of ["issue", "project"] as const) {
    const allowedCategories = TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE[entityType] as readonly TrailStatusCategory[];
    const entityConfig = configuration.workflowStatuses[entityType] as unknown as Readonly<
      Record<string, TrailStatusCategoryConfiguration | undefined>
    >;
    for (const categoryKey of Object.keys(entityConfig)) {
      if (!allowedCategories.includes(categoryKey as TrailStatusCategory)) {
        issues.push(issue(
          "status.category.unsupported",
          `Status Category ${categoryKey} is not supported for ${entityType}`,
          "workflowStatuses",
        ));
      }
    }
    for (const category of allowedCategories) {
      const categoryConfig = entityConfig[category];
      if (categoryConfig === undefined) {
        issues.push(issue(
          "status.category.missing",
          `${entityType}.${category} must be configured`,
          "workflowStatuses",
        ));
        continue;
      }
      if (categoryConfig.definitionIds.length === 0) {
        issues.push(issue("status.category.empty", `${entityType}.${category} must contain at least one definition`, "workflowStatuses"));
      }
      const local = new Set<string>();
      for (const id of categoryConfig.definitionIds) {
        if (local.has(id)) issues.push(issue("status.category.duplicate", `Duplicate definition ID in ${entityType}.${category}: ${id}`, "workflowStatuses"));
        local.add(id);
        referencedStatusIds.add(id);
        const definition = definitionsById.get(id);
        if (definition === undefined) {
          issues.push(issue("status.reference.missing", `Unknown StatusDefinition ID: ${id}`, "workflowStatuses"));
        } else if (definition.entityType !== entityType || definition.category !== category) {
          issues.push(issue("status.reference.scope", `StatusDefinition ${id} does not belong to ${entityType}.${category}`, "workflowStatuses"));
        }
      }
      if (!local.has(categoryConfig.defaultId)) {
        issues.push(issue("status.default.invalid", `Default ${categoryConfig.defaultId} is not a member of ${entityType}.${category}`, "workflowStatuses"));
      }
    }
  }

  for (const id of definitionsById.keys()) {
    if (!referencedStatusIds.has(id)) {
      issues.push(issue("status.definition.unreferenced", `StatusDefinition is not registered in workflowStatuses: ${id}`, "statusDefinitions"));
    }
  }

  const groupsById = new Map<string, (typeof configuration.labelGroups)[number]>();
  for (const group of configuration.labelGroups) {
    if (!isTrailId(group.id)) issues.push(issue("label-group.id.invalid", "LabelGroup id must be non-empty", "labelGroups"));
    if (!nonEmptyText(group.name)) issues.push(issue("label-group.name.invalid", "LabelGroup name must be non-empty", "labelGroups"));
    if (!isTrailLabelSelectionMode(group.selectionMode)) issues.push(issue("label-group.selection.invalid", "LabelGroup selectionMode is invalid", "labelGroups"));
    if (groupsById.has(group.id)) issues.push(issue("label-group.id.duplicate", `Duplicate LabelGroup ID: ${group.id}`, "labelGroups"));
    groupsById.set(group.id, group);
    const registered = new Set<string>();
    for (const candidate of group.registeredEntityTypes as readonly unknown[]) {
      if (!isTrailLabelEntityType(candidate)) {
        issues.push(issue(
          "label-group.entity-type.invalid",
          `Invalid LabelGroup entity type: ${String(candidate)}`,
          "labelGroups",
        ));
        continue;
      }
      if (registered.has(candidate)) {
        issues.push(issue(
          "label-group.entity-type.duplicate",
          `Duplicate LabelGroup entity type: ${candidate}`,
          "labelGroups",
        ));
      }
      registered.add(candidate);
    }
  }

  const labelIds = new Set<string>();
  for (const label of configuration.labels) {
    if (!isTrailId(label.id)) issues.push(issue("label.id.invalid", "Label id must be non-empty", "labels"));
    if (!nonEmptyText(label.name)) issues.push(issue("label.name.invalid", "Label name must be non-empty", "labels"));
    if (!isTrailId(label.groupId) || !groupsById.has(label.groupId)) {
      issues.push(issue("label.group.missing", `Label references unknown group: ${label.groupId}`, "labels"));
    }
    if (labelIds.has(label.id)) issues.push(issue("label.id.duplicate", `Duplicate Label ID: ${label.id}`, "labels"));
    labelIds.add(label.id);
  }

  if (!isTrailPlainObject(configuration.estimateWeights)) {
    issues.push(issue(
      "estimate-weight.invalid",
      "estimateWeights must define every fixed Estimate level",
      "estimateWeights",
    ));
  } else {
    const configuredKeys = Object.keys(configuration.estimateWeights);
    for (const key of configuredKeys) {
      if (!(TRAIL_ESTIMATES as readonly string[]).includes(key)) {
        issues.push(issue(
          "estimate-weight.unsupported",
          `Unsupported Estimate weight key: ${key}`,
          "estimateWeights",
        ));
      }
    }
    for (const estimate of TRAIL_ESTIMATES) {
      if (!isTrailEstimateWeight(configuration.estimateWeights[estimate])) {
        issues.push(issue(
          "estimate-weight.invalid",
          `Estimate weight for ${estimate} must be a positive finite number`,
          "estimateWeights",
        ));
      }
    }
  }

  if (configuration.cycle.defaultEndRule !== "end-of-next-week") {
    issues.push(issue("cycle.default-end-rule.invalid", "Unsupported Cycle default end rule", "cycle"));
  }
  if (!nonEmptyText(configuration.temporal.timezone) || !validateTimezone(configuration.temporal.timezone)) {
    issues.push(issue("temporal.timezone.invalid", "timezone must be a supported IANA timezone", "temporal"));
  }
  for (const key of ["dateFormat", "timeFormat", "dateTimeFormat"] as const) {
    const value = configuration.temporal[key];
    if (value !== undefined && !nonEmptyText(value)) {
      issues.push(issue(`temporal.${key}.invalid`, `${key} must be non-empty when present`, "temporal"));
    }
  }

  return issues;
}

export function validateTrailWorkspaceStateContents(
  workspaceState: Pick<TrailWorkspaceState, "customViews" | "favorites" | "home">,
): readonly TrailDomainValidationIssue[] {
  const issues: TrailDomainValidationIssue[] = [];
  const viewIds = new Set<string>();
  for (const view of workspaceState.customViews) {
    if (!isTrailId(view.id)) issues.push(issue("custom-view.id.invalid", "Custom View id must be non-empty", "customViews"));
    if (!nonEmptyText(view.name)) issues.push(issue("custom-view.name.invalid", "Custom View name must be non-empty", "customViews"));
    if (!nonEmptyText(view.selection.entityType)) issues.push(issue("custom-view.entity-type.invalid", "Saved View entityType must be non-empty", "customViews"));
    if (!isTrailPlainObject(view.presentation)) issues.push(issue("custom-view.presentation.invalid", "Saved View presentation must be an object", "customViews"));
    if (viewIds.has(view.id)) issues.push(issue("custom-view.id.duplicate", `Duplicate Custom View ID: ${view.id}`, "customViews"));
    viewIds.add(view.id);
  }
  for (const favorite of workspaceState.favorites) {
    if (!nonEmptyText(favorite.targetType) || !isTrailId(favorite.targetId)) {
      issues.push(issue("favorite.reference.invalid", "Favorite targetType and targetId must be non-empty", "favorites"));
    }
  }
  if (!isTrailPlainObject(workspaceState.home)) {
    issues.push(issue("home.invalid", "Home composition must be an object", "home"));
  }
  return issues;
}

export function validateTrailWorkspaceState(
  workspaceState: TrailWorkspaceState,
): readonly TrailDomainValidationIssue[] {
  const issues = [...validateTrailWorkspaceStateContents(workspaceState)];
  if (!isTrailId(workspaceState.defaultProjectId)) {
    issues.push(issue(
      "default-project.invalid",
      "defaultProjectId must be a non-empty Project ID",
      "defaultProjectId",
    ));
  }
  return issues;
}
