import type { ChangeEvent } from "react";

import type { TrailConfiguration, TrailLabelGroup } from "../../domain/model/trail-configuration";
import type { TrailLabelEntityType } from "../../domain/model/trail-values";

function applicableLabelGroups(
  configuration: TrailConfiguration,
  entityType: TrailLabelEntityType,
): readonly TrailLabelGroup[] {
  return configuration.labelGroups.filter(({ registeredEntityTypes }) => (
    registeredEntityTypes.includes(entityType)
  ));
}

/** Shared draft editor for LabelGroup selection; Domain planning remains the legality owner. */
export function TrailLabelEditor(props: {
  readonly configuration: TrailConfiguration;
  readonly disabled: boolean;
  readonly entityType: TrailLabelEntityType;
  readonly labelIds: readonly string[];
  readonly onChange: (labelIds: readonly string[]) => void;
}) {
  const groups = applicableLabelGroups(props.configuration, props.entityType);
  if (groups.length === 0) return null;

  return (
    <fieldset disabled={props.disabled}>
      <legend>Labels</legend>
      {groups.map((group) => (
        <TrailLabelGroupEditor
          configuration={props.configuration}
          group={group}
          key={group.id}
          labelIds={props.labelIds}
          onChange={props.onChange}
        />
      ))}
    </fieldset>
  );
}

function TrailLabelGroupEditor(props: {
  readonly configuration: TrailConfiguration;
  readonly group: TrailLabelGroup;
  readonly labelIds: readonly string[];
  readonly onChange: (labelIds: readonly string[]) => void;
}) {
  const labels = props.configuration.labels.filter(({ groupId }) => groupId === props.group.id);
  const groupIds = new Set(labels.map(({ id }) => id));
  if (labels.length === 0) return null;

  if (props.group.selectionMode === "single") {
    const selected = props.labelIds.find((id) => groupIds.has(id)) ?? "";
    return (
      <label>
        <span>{props.group.name}</span>
        <select
          aria-label={`${props.group.name} label`}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const outsideGroup = props.labelIds.filter((id) => !groupIds.has(id));
            props.onChange(event.target.value === ""
              ? outsideGroup
              : [...outsideGroup, event.target.value]);
          }}
          value={selected}
        >
          <option value="">None</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>{label.name}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div>
      <span>{props.group.name}</span>
      {labels.map((label) => (
        <label key={label.id}>
          <input
            checked={props.labelIds.includes(label.id)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              props.onChange(event.target.checked
                ? [...props.labelIds, label.id]
                : props.labelIds.filter((id) => id !== label.id));
            }}
            type="checkbox"
          />
          <span>{label.name}</span>
        </label>
      ))}
    </div>
  );
}
