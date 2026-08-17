import type { TrailConfiguration } from "../model/trail-configuration";
import type { TrailDomainEntity, TrailIssue } from "../model/trail-entities";
import type { TrailWorkspaceState } from "../model/trail-workspace-state";

function sameOptionalText(left: string | undefined, right: string | undefined): boolean {
  return left === right;
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftValues = [...left].sort();
  const rightValues = [...right].sort();
  return leftValues.every((value, index) => value === rightValues[index]);
}

function sameIssue(left: TrailIssue, right: TrailIssue): boolean {
  if (left.context !== right.context) return false;
  if (
    left.id !== right.id
    || left.title !== right.title
    || !sameOptionalText(left.description, right.description)
    || left.projectId !== right.projectId
    || left.milestoneId !== right.milestoneId
    || left.priority !== right.priority
    || left.estimate !== right.estimate
    || !sameStringSet(left.labelIds, right.labelIds)
  ) return false;

  if (left.context === "triage" && right.context === "triage") {
    return left.due === right.due;
  }
  if (left.context === "workflow" && right.context === "workflow") {
    return left.statusDefinitionId === right.statusDefinitionId
      && left.due === right.due
      && left.createdAt === right.createdAt
      && left.firstStartedAt === right.firstStartedAt
      && left.terminalAt === right.terminalAt;
  }
  return false;
}

export function sameTrailDomainEntity(
  left: TrailDomainEntity,
  right: TrailDomainEntity,
): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "initiative": {
      if (right.kind !== "initiative") return false;
      return left.value.id === right.value.id
        && left.value.title === right.value.title
        && left.value.description === right.value.description
        && left.value.priority === right.value.priority
        && left.value.due === right.value.due
        && sameStringSet(left.value.labelIds, right.value.labelIds);
    }
    case "project": {
      if (right.kind !== "project") return false;
      return left.value.id === right.value.id
        && left.value.title === right.value.title
        && left.value.description === right.value.description
        && left.value.statusDefinitionId === right.value.statusDefinitionId
        && left.value.initiativeId === right.value.initiativeId
        && left.value.priority === right.value.priority
        && left.value.due === right.value.due
        && sameStringSet(left.value.labelIds, right.value.labelIds);
    }
    case "milestone": {
      if (right.kind !== "milestone") return false;
      return left.value.id === right.value.id
        && left.value.title === right.value.title
        && left.value.description === right.value.description
        && left.value.projectId === right.value.projectId
        && left.value.due === right.value.due;
    }
    case "issue": {
      if (right.kind !== "issue") return false;
      return sameIssue(left.value, right.value);
    }
    case "cycle": {
      if (right.kind !== "cycle") return false;
      return left.value.id === right.value.id
        && left.value.startedAt === right.value.startedAt
        && left.value.plannedEnd === right.value.plannedEnd
        && left.value.endedAt === right.value.endedAt
        && sameStringSet(left.value.issueIds, right.value.issueIds);
    }
  }
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(",")}}`;
}

/** Configuration ordering that is authoritative remains array ordering here. */
export function sameTrailConfiguration(
  left: TrailConfiguration,
  right: TrailConfiguration,
): boolean {
  return stableJson(left) === stableJson(right);
}

/** Favorites and saved-view ordering are intentionally compared exactly. */
export function sameTrailWorkspaceState(
  left: TrailWorkspaceState,
  right: TrailWorkspaceState,
): boolean {
  return stableJson(left) === stableJson(right);
}
