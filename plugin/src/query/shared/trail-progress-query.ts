import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type { TrailStatusCategory } from "../../domain/model/trail-values";
import { resolveTrailStatusDefinition } from "../../domain/rules/trail-status-rules";

export type TrailProgressReadModel =
  | {
      readonly max: number;
      readonly unavailable?: false;
      readonly value: number;
    }
  | {
      readonly max?: never;
      readonly unavailable: true;
      readonly value?: never;
    };

export function createTrailProgressReadModel(
  categories: readonly TrailStatusCategory[],
): TrailProgressReadModel {
  let completed = 0;
  let effective = 0;

  for (const category of categories) {
    if (category === "canceled") continue;
    effective += 1;
    if (category === "completed") completed += 1;
  }

  return effective === 0
    ? { unavailable: true }
    : { max: effective, value: completed };
}

export function selectTrailWorkflowIssueProgress(
  configuration: TrailConfiguration,
  issues: readonly TrailWorkflowIssue[],
): TrailProgressReadModel | null {
  const categories: TrailStatusCategory[] = [];
  for (const issue of issues) {
    const status = resolveTrailStatusDefinition(
      configuration,
      "issue",
      issue.statusDefinitionId,
    );
    if (status === undefined) return null;
    categories.push(status.category);
  }
  return createTrailProgressReadModel(categories);
}
