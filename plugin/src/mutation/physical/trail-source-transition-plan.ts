import type { TrailCommittedRuntime } from "../../runtime/store/trail-runtime-store";
import type {
  TrailMutationPlan,
  TrailStateEffect,
} from "../plans/trail-mutation-plan";
import {
  materializeTrailSingleTransactionPlan,
  type TrailSingleTransactionPlan,
} from "./trail-single-transaction-plan";
import type { TrailPlacementEnvironment } from "./trail-placement-resolver";

export interface TrailSourceTransitionPlan {
  readonly commandId: string;
  readonly compensation?: TrailSingleTransactionPlan;
  readonly intent: string;
  readonly source: TrailSingleTransactionPlan;
  readonly target: TrailSingleTransactionPlan;
}

function planForEffect(
  logicalPlan: TrailMutationPlan,
  effect: TrailStateEffect,
): TrailMutationPlan {
  return {
    ...logicalPlan,
    affectedScope: logicalPlan.affectedScope,
    effects: [effect],
  };
}

function compensationForTarget(
  target: TrailSingleTransactionPlan,
): TrailSingleTransactionPlan | undefined {
  switch (target.operation.kind) {
    case "triage-create":
      return {
        ...target,
        operation: {
          expectedIssue: target.operation.issue,
          kind: "triage-delete",
        },
      };
    case "workflow-create":
      return {
        ...target,
        operation: {
          expectedIssue: target.operation.issue,
          kind: "workflow-delete",
        },
      };
    default:
      return undefined;
  }
}

/**
 * Materializes the currently active create-target/delete-source transition form.
 * The topology stays distinct from Single Transaction so future placement-moving
 * Replace effects can join this owner without changing Feature orchestration.
 */
export async function materializeTrailSourceTransitionPlan(
  logicalPlan: TrailMutationPlan,
  committed: TrailCommittedRuntime,
  environment: TrailPlacementEnvironment = {},
): Promise<TrailSourceTransitionPlan> {
  const targetEffects = logicalPlan.effects.filter((effect) => effect.kind === "create");
  const sourceEffects = logicalPlan.effects.filter((effect) => effect.kind === "delete");

  if (
    logicalPlan.effects.length !== 2
    || targetEffects.length !== 1
    || sourceEffects.length !== 1
  ) {
    throw new Error(
      "Active source transition materialization requires one Create target and one Delete source",
    );
  }

  const targetEffect = targetEffects[0];
  const sourceEffect = sourceEffects[0];
  if (targetEffect === undefined || sourceEffect === undefined) {
    throw new Error("Source transition effects are incomplete");
  }

  const [target, source] = await Promise.all([
    materializeTrailSingleTransactionPlan(
      planForEffect(logicalPlan, targetEffect),
      committed,
      environment,
    ),
    materializeTrailSingleTransactionPlan(
      planForEffect(logicalPlan, sourceEffect),
      committed,
      environment,
    ),
  ]);

  if (target.sourcePath === source.sourcePath) {
    throw new Error("Source transition requires distinct authoritative carriers");
  }

  return {
    commandId: logicalPlan.commandId,
    compensation: compensationForTarget(target),
    intent: logicalPlan.intent,
    source,
    target,
  };
}
