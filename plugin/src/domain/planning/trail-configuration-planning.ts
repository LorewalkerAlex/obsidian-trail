import type { TrailConfiguration, TrailStatusDefinition } from "../model/trail-configuration";
import type {
  TrailDomainEntity,
  TrailInitiative,
  TrailIssue,
  TrailProject,
} from "../model/trail-entities";
import type { TrailLabelEntityType, TrailStatusEntityType } from "../model/trail-values";
import {
  sameTrailConfiguration,
  sameTrailDomainEntity,
} from "../rules/trail-domain-equality";
import { findTrailLabelSelectionViolations } from "../rules/trail-label-rules";
import { findTrailStatusDefinition } from "../rules/trail-status-rules";
import { validateTrailConfiguration } from "../validation/trail-configuration-validation";
import { validateTrailWorkspaceGraph } from "../validation/trail-workspace-validation";
import {
  createTrailMutationPlan,
  type TrailMutationPlan,
  type TrailStateEffect,
} from "../../mutation/plans/trail-mutation-plan";
import {
  readyTrailPlan,
  rejectTrailPlan,
  trailPlanNeedsInput,
  type TrailPlanResult,
} from "./trail-plan-result";
import type { TrailPlanningState } from "./trail-planning-state";

export interface ChangeTrailConfigurationCommand {
  readonly commandId: string;
  readonly expectedConfiguration: TrailConfiguration;
  readonly nextConfiguration: TrailConfiguration;
  /** Full replacement Label selections for entities whose current selections become illegal. */
  readonly resolvedLabelIdsByEntityId?: Readonly<Record<string, readonly string[]>>;
  /** Replacement StatusDefinition IDs for entities whose referenced Status changes meaning or disappears. */
  readonly resolvedStatusDefinitionIdsByEntityId?: Readonly<Record<string, string>>;
}

export interface TrailConfigurationPlan {
  readonly configuration: TrailConfiguration;
  readonly plan: TrailMutationPlan;
  readonly updatedEntities: readonly TrailDomainEntity[];
}

interface StatusReferenceOwner {
  readonly currentDefinition: TrailStatusDefinition;
  readonly entityId: string;
  readonly entityType: TrailStatusEntityType;
  readonly kind: "issue" | "project";
}

type LabelOwner =
  | {
      readonly entityType: "initiative";
      readonly kind: "initiative";
      readonly value: TrailInitiative;
    }
  | {
      readonly entityType: "project";
      readonly kind: "project";
      readonly value: TrailProject;
    }
  | {
      readonly entityType: "issue";
      readonly kind: "issue";
      readonly value: TrailIssue;
    };

function ownKeys<T>(value: Readonly<Record<string, T>> | undefined): readonly string[] {
  return value === undefined ? [] : Object.keys(value);
}

function hasOwn<T>(value: Readonly<Record<string, T>> | undefined, key: string): boolean {
  return value !== undefined && Object.prototype.hasOwnProperty.call(value, key);
}

function isStatusReferenceSemanticallyCompatible(
  currentDefinition: TrailStatusDefinition,
  nextDefinition: TrailStatusDefinition | undefined,
): boolean {
  return nextDefinition !== undefined
    && nextDefinition.entityType === currentDefinition.entityType
    && nextDefinition.category === currentDefinition.category;
}

function collectStatusReferenceOwners(
  state: TrailPlanningState,
): TrailPlanResult<readonly StatusReferenceOwner[]> {
  const owners: StatusReferenceOwner[] = [];

  for (const project of state.domain.projectsById.values()) {
    const definition = findTrailStatusDefinition(state.configuration, project.statusDefinitionId);
    if (definition === undefined || definition.entityType !== "project") {
      return rejectTrailPlan(
        "configuration-current-status-invalid",
        `Project ${project.id} has an invalid current StatusDefinition reference`,
      );
    }
    owners.push({
      currentDefinition: definition,
      entityId: project.id,
      entityType: "project",
      kind: "project",
    });
  }

  for (const issue of state.domain.issuesById.values()) {
    if (issue.context !== "workflow") continue;
    const definition = findTrailStatusDefinition(state.configuration, issue.statusDefinitionId);
    if (definition === undefined || definition.entityType !== "issue") {
      return rejectTrailPlan(
        "configuration-current-status-invalid",
        `Workflow Issue ${issue.id} has an invalid current StatusDefinition reference`,
      );
    }
    owners.push({
      currentDefinition: definition,
      entityId: issue.id,
      entityType: "issue",
      kind: "issue",
    });
  }

  return readyTrailPlan(owners);
}

function collectLabelOwners(state: TrailPlanningState): readonly LabelOwner[] {
  return [
    ...[...state.domain.initiativesById.values()].map((value) => ({
      entityType: "initiative" as const,
      kind: "initiative" as const,
      value,
    })),
    ...[...state.domain.projectsById.values()].map((value) => ({
      entityType: "project" as const,
      kind: "project" as const,
      value,
    })),
    ...[...state.domain.issuesById.values()].map((value) => ({
      entityType: "issue" as const,
      kind: "issue" as const,
      value,
    })),
  ];
}

function unexpectedResolutionKeys(
  providedKeys: readonly string[],
  requiredIds: ReadonlySet<string>,
): readonly string[] {
  return providedKeys.filter((entityId) => !requiredIds.has(entityId)).sort();
}

function missingResolutionIds<T>(
  requiredIds: ReadonlySet<string>,
  resolutions: Readonly<Record<string, T>> | undefined,
): readonly string[] {
  return [...requiredIds].filter((entityId) => !hasOwn(resolutions, entityId)).sort();
}

function labelResolutionIsValid(
  configuration: TrailConfiguration,
  entityType: TrailLabelEntityType,
  labelIds: readonly string[],
): boolean {
  return new Set(labelIds).size === labelIds.length
    && findTrailLabelSelectionViolations(configuration, entityType, labelIds).length === 0;
}

/** Plans one atomic configuration replacement plus only the entity repairs it makes necessary. */
export function planChangeTrailConfiguration(
  state: TrailPlanningState,
  command: ChangeTrailConfigurationCommand,
): TrailPlanResult<TrailConfigurationPlan> {
  if (!sameTrailConfiguration(state.configuration, command.expectedConfiguration)) {
    return rejectTrailPlan(
      "configuration-changed",
      "Configuration changed before action",
    );
  }

  const configurationIssues = validateTrailConfiguration(command.nextConfiguration);
  if (configurationIssues.length > 0) {
    const first = configurationIssues[0];
    return rejectTrailPlan(
      "configuration-invalid",
      `Next configuration is invalid: ${first.code}: ${first.message}`,
    );
  }

  const statusOwnersResult = collectStatusReferenceOwners(state);
  if (statusOwnersResult.kind !== "ready") return statusOwnersResult;
  const statusOwners = statusOwnersResult.plan;

  const requiredStatusOwners = statusOwners.filter((owner) => {
    const nextDefinition = findTrailStatusDefinition(
      command.nextConfiguration,
      owner.currentDefinition.id,
    );
    return !isStatusReferenceSemanticallyCompatible(owner.currentDefinition, nextDefinition);
  });
  const requiredStatusIds = new Set(requiredStatusOwners.map(({ entityId }) => entityId));

  const labelOwners = collectLabelOwners(state);
  const requiredLabelOwners = labelOwners.filter(({ entityType, value }) => (
    findTrailLabelSelectionViolations(
      command.nextConfiguration,
      entityType,
      value.labelIds,
    ).length > 0
  ));
  const requiredLabelIds = new Set(requiredLabelOwners.map(({ value }) => value.id));

  const unexpectedStatusIds = unexpectedResolutionKeys(
    ownKeys(command.resolvedStatusDefinitionIdsByEntityId),
    requiredStatusIds,
  );
  if (unexpectedStatusIds.length > 0) {
    return rejectTrailPlan(
      "configuration-status-resolution-unexpected",
      `Status resolution was supplied for unaffected entities: ${unexpectedStatusIds.join(", ")}`,
    );
  }

  const unexpectedLabelIds = unexpectedResolutionKeys(
    ownKeys(command.resolvedLabelIdsByEntityId),
    requiredLabelIds,
  );
  if (unexpectedLabelIds.length > 0) {
    return rejectTrailPlan(
      "configuration-label-resolution-unexpected",
      `Label resolution was supplied for unaffected entities: ${unexpectedLabelIds.join(", ")}`,
    );
  }

  const missingStatusIds = missingResolutionIds(
    requiredStatusIds,
    command.resolvedStatusDefinitionIdsByEntityId,
  );
  const missingLabelIds = missingResolutionIds(
    requiredLabelIds,
    command.resolvedLabelIdsByEntityId,
  );
  if (missingStatusIds.length > 0 || missingLabelIds.length > 0) {
    const parts: string[] = [];
    if (missingStatusIds.length > 0) parts.push(`Status: ${missingStatusIds.join(", ")}`);
    if (missingLabelIds.length > 0) parts.push(`Labels: ${missingLabelIds.join(", ")}`);
    return trailPlanNeedsInput(
      "configuration-reference-resolution-required",
      `Configuration change requires explicit reference resolution. ${parts.join("; ")}`,
    );
  }

  const initiativesById = new Map(state.domain.initiativesById);
  const projectsById = new Map(state.domain.projectsById);
  const issuesById = new Map(state.domain.issuesById);

  for (const owner of requiredStatusOwners) {
    const targetId = command.resolvedStatusDefinitionIdsByEntityId?.[owner.entityId];
    if (targetId === undefined) throw new Error(`Missing Status resolution: ${owner.entityId}`);
    const targetDefinition = findTrailStatusDefinition(command.nextConfiguration, targetId);
    if (!isStatusReferenceSemanticallyCompatible(owner.currentDefinition, targetDefinition)) {
      return rejectTrailPlan(
        "configuration-status-resolution-invalid",
        `Status resolution for ${owner.entityId} must target a ${owner.entityType} StatusDefinition in ${owner.currentDefinition.category}`,
      );
    }

    if (owner.kind === "project") {
      const current = projectsById.get(owner.entityId);
      if (current === undefined) throw new Error(`Missing planned Project: ${owner.entityId}`);
      projectsById.set(owner.entityId, { ...current, statusDefinitionId: targetId });
    } else {
      const current = issuesById.get(owner.entityId);
      if (current === undefined || current.context !== "workflow") {
        throw new Error(`Missing planned Workflow Issue: ${owner.entityId}`);
      }
      issuesById.set(owner.entityId, { ...current, statusDefinitionId: targetId });
    }
  }

  for (const owner of requiredLabelOwners) {
    const labelIds = command.resolvedLabelIdsByEntityId?.[owner.value.id];
    if (labelIds === undefined) throw new Error(`Missing Label resolution: ${owner.value.id}`);
    if (!labelResolutionIsValid(command.nextConfiguration, owner.entityType, labelIds)) {
      return rejectTrailPlan(
        "configuration-label-resolution-invalid",
        `Label resolution for ${owner.value.id} is not legal in the next configuration`,
      );
    }

    switch (owner.kind) {
      case "initiative":
        initiativesById.set(owner.value.id, { ...owner.value, labelIds: [...labelIds] });
        break;
      case "project": {
        const current = projectsById.get(owner.value.id);
        if (current === undefined) throw new Error(`Missing planned Project: ${owner.value.id}`);
        projectsById.set(owner.value.id, { ...current, labelIds: [...labelIds] });
        break;
      }
      case "issue": {
        const current = issuesById.get(owner.value.id);
        if (current === undefined) throw new Error(`Missing planned Issue: ${owner.value.id}`);
        issuesById.set(owner.value.id, { ...current, labelIds: [...labelIds] });
        break;
      }
    }
  }

  const prospectiveDomain = {
    cyclesById: state.domain.cyclesById,
    initiativesById,
    issuesById,
    milestonesById: state.domain.milestonesById,
    projectsById,
  };
  const resultIssues = validateTrailWorkspaceGraph({
    configuration: command.nextConfiguration,
    domain: prospectiveDomain,
    workspaceState: state.workspaceState,
  });
  if (resultIssues.length > 0) {
    const first = resultIssues[0];
    return rejectTrailPlan(
      "configuration-result-invalid",
      `Configuration repair would leave an invalid workspace: ${first.code}: ${first.message}`,
    );
  }

  const updatedEntities: TrailDomainEntity[] = [];
  for (const [entityId, current] of state.domain.initiativesById) {
    const next = initiativesById.get(entityId);
    if (next === undefined) throw new Error(`Missing prospective Initiative: ${entityId}`);
    const before: TrailDomainEntity = { kind: "initiative", value: current };
    const after: TrailDomainEntity = { kind: "initiative", value: next };
    if (!sameTrailDomainEntity(before, after)) updatedEntities.push(after);
  }
  for (const [entityId, current] of state.domain.projectsById) {
    const next = projectsById.get(entityId);
    if (next === undefined) throw new Error(`Missing prospective Project: ${entityId}`);
    const before: TrailDomainEntity = { kind: "project", value: current };
    const after: TrailDomainEntity = { kind: "project", value: next };
    if (!sameTrailDomainEntity(before, after)) updatedEntities.push(after);
  }
  for (const [entityId, current] of state.domain.issuesById) {
    const next = issuesById.get(entityId);
    if (next === undefined) throw new Error(`Missing prospective Issue: ${entityId}`);
    const before: TrailDomainEntity = { kind: "issue", value: current };
    const after: TrailDomainEntity = { kind: "issue", value: next };
    if (!sameTrailDomainEntity(before, after)) updatedEntities.push(after);
  }
  updatedEntities.sort((left, right) => left.value.id.localeCompare(right.value.id));

  const effects: TrailStateEffect[] = [
    {
      after: command.nextConfiguration,
      before: state.configuration,
      kind: "replace-configuration",
    },
    ...updatedEntities.map((after) => {
      let before: TrailDomainEntity;
      switch (after.kind) {
        case "initiative": {
          const value = state.domain.initiativesById.get(after.value.id);
          if (value === undefined) throw new Error(`Missing Initiative: ${after.value.id}`);
          before = { kind: "initiative", value };
          break;
        }
        case "project": {
          const value = state.domain.projectsById.get(after.value.id);
          if (value === undefined) throw new Error(`Missing Project: ${after.value.id}`);
          before = { kind: "project", value };
          break;
        }
        case "issue": {
          const value = state.domain.issuesById.get(after.value.id);
          if (value === undefined) throw new Error(`Missing Issue: ${after.value.id}`);
          before = { kind: "issue", value };
          break;
        }
        case "milestone":
        case "cycle":
          throw new Error(`Unexpected configuration repair entity: ${after.kind}`);
      }
      return { after, before, kind: "replace-entity" as const };
    }),
  ];

  return readyTrailPlan({
    configuration: command.nextConfiguration,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects,
      intent: "configuration.change",
    }),
    updatedEntities,
  });
}
