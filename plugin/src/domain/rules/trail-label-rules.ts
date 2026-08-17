import type { TrailConfiguration } from "../model/trail-configuration";
import type { TrailLabelEntityType } from "../model/trail-values";

export type TrailLabelSelectionViolation =
  | { readonly kind: "label-missing"; readonly labelId: string }
  | {
      readonly groupId: string;
      readonly kind: "label-group-missing";
      readonly labelId: string;
    }
  | {
      readonly groupId: string;
      readonly kind: "label-scope";
      readonly labelId: string;
    }
  | {
      readonly groupId: string;
      readonly kind: "single-selection";
      readonly labelIds: readonly string[];
    };

/** Evaluates one entity's current Label selection against the active configuration. */
export function findTrailLabelSelectionViolations(
  configuration: TrailConfiguration,
  entityType: TrailLabelEntityType,
  labelIds: readonly string[],
): readonly TrailLabelSelectionViolation[] {
  const labelsById = new Map(configuration.labels.map((label) => [label.id, label] as const));
  const groupsById = new Map(configuration.labelGroups.map((group) => [group.id, group] as const));
  const selectedByGroup = new Map<string, string[]>();
  const violations: TrailLabelSelectionViolation[] = [];

  for (const labelId of labelIds) {
    const label = labelsById.get(labelId);
    if (label === undefined) {
      violations.push({ kind: "label-missing", labelId });
      continue;
    }

    const group = groupsById.get(label.groupId);
    if (group === undefined) {
      violations.push({ groupId: label.groupId, kind: "label-group-missing", labelId });
      continue;
    }

    if (!group.registeredEntityTypes.includes(entityType)) {
      violations.push({ groupId: group.id, kind: "label-scope", labelId });
    }

    const selected = selectedByGroup.get(group.id) ?? [];
    selected.push(label.id);
    selectedByGroup.set(group.id, selected);
  }

  for (const [groupId, selected] of selectedByGroup) {
    if (groupsById.get(groupId)?.selectionMode === "single" && selected.length > 1) {
      violations.push({ groupId, kind: "single-selection", labelIds: selected });
    }
  }

  return violations;
}
