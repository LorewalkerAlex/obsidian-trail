import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailInitiative } from "../../domain/model/trail-entities";
import type {
  TrailLabelId,
  TrailPriority,
  TrailTimestamp,
} from "../../domain/model/trail-values";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

export interface TrailInitiativeInspectorReadModel {
  readonly configuration: TrailConfiguration;
  readonly due: TrailTimestamp | undefined;
  readonly expectedInitiative: TrailInitiative;
  readonly labelIds: readonly TrailLabelId[];
  readonly priority: TrailPriority | undefined;
  readonly title: string;
}

/**
 * Projects one Initiative into the stable-property Inspector contract from one
 * readable/effective Runtime snapshot. Description remains Main View narrative.
 */
export function selectTrailInitiativeInspectorReadModel(
  state: TrailRuntimeState,
  initiativeId: string,
): TrailInitiativeInspectorReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const initiative = readable.authoritative.domain.initiativesById.get(initiativeId);
  if (initiative === undefined) return null;

  return {
    configuration,
    due: initiative.due,
    expectedInitiative: initiative,
    labelIds: initiative.labelIds,
    priority: initiative.priority,
    title: initiative.title,
  };
}
