import type {
  TrailDomainSourceEntityMutation,
  TrailDomainSourceMutationOptions,
  TrailNewDomainSource,
} from "../../persistence/domain-sources/trail-domain-source-operation";
import type { TrailManagedDomainSourceKind } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";

export type TrailPersistenceOperation =
  | { readonly kind: "create-domain-source"; readonly source: TrailNewDomainSource }
  | {
      readonly kind: "mutate-domain-source";
      readonly mutation: TrailDomainSourceEntityMutation;
      readonly options?: TrailDomainSourceMutationOptions;
      readonly path: string;
      readonly sourceKind: TrailManagedDomainSourceKind;
    }
  | {
      readonly from: string;
      readonly kind: "rename-domain-source";
      readonly sourceKind: TrailManagedDomainSourceKind;
      readonly to: string;
    }
  | { readonly kind: "delete-domain-source"; readonly path: string }
  | {
      readonly after: TrailPluginDataSnapshot;
      readonly before: TrailPluginDataSnapshot;
      readonly kind: "save-plugin-data";
    };

interface TrailPersistencePlanBase {
  readonly commandId: string;
  readonly intent: string;
}

export interface TrailSingleTransactionPlan extends TrailPersistencePlanBase {
  readonly kind: "single";
  readonly operations: readonly TrailPersistenceOperation[];
}

export interface TrailSourceTransitionPlan extends TrailPersistencePlanBase {
  readonly compensation: readonly TrailPersistenceOperation[];
  readonly kind: "source-transition";
  readonly source: readonly TrailPersistenceOperation[];
  readonly target: readonly TrailPersistenceOperation[];
}

export interface TrailIntegrityBatchStage {
  readonly name: "prepare" | "destructive";
  readonly operations: readonly TrailPersistenceOperation[];
}

export interface TrailIntegrityBatchPlan extends TrailPersistencePlanBase {
  readonly kind: "integrity-batch";
  readonly stages: readonly TrailIntegrityBatchStage[];
}

/** The complete V1 topology universe; no arbitrary transaction graph is exposed. */
export type TrailPersistenceTransactionPlan =
  | TrailSingleTransactionPlan
  | TrailSourceTransitionPlan
  | TrailIntegrityBatchPlan;
