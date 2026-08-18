import type { ChangeEvent } from "react";

import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import {
  TRAIL_STATUS_CATEGORIES,
  type TrailStatusCategory,
  type TrailStatusEntityType,
} from "../../domain/model/trail-values";
import { selectTrailStatusOptionGroups } from "../../query/shared/trail-status-query";

function statusCategoryLabel(category: TrailStatusCategory): string {
  switch (category) {
    case "backlog": return "Backlog";
    case "unstarted": return "Unstarted";
    case "started": return "Started";
    case "completed": return "Completed";
    case "canceled": return "Canceled";
  }
}

/**
 * Owns configured StatusDefinition presentation only. Consumers keep their own
 * Application intent, validation feedback, and any state-specific follow-up UI.
 */
export function TrailStatusPicker(props: {
  readonly ariaLabel: string;
  readonly configuration: TrailConfiguration;
  readonly disabled: boolean;
  readonly entityType: TrailStatusEntityType;
  readonly onChange: (targetStatusDefinitionId: string) => void;
  readonly value: string;
}) {
  const groups = selectTrailStatusOptionGroups(props.configuration, props.entityType);

  return (
    <label className="trail-status-picker">
      <span className="screen-reader-text">{props.ariaLabel}</span>
      <select
        disabled={props.disabled}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => props.onChange(event.target.value)}
        value={props.value}
      >
        {TRAIL_STATUS_CATEGORIES.map((category) => {
          const group = groups.find((candidate) => candidate.category === category);
          return (
            <optgroup key={category} label={statusCategoryLabel(category)}>
              {(group?.definitions ?? []).map((definition) => (
                <option key={definition.id} value={definition.id}>{definition.name}</option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}
