/** Receipt returned by Application actions that optimistically mutate one entity. */
export interface TrailEntityMutationReceipt {
  readonly completion: Promise<void>;
  readonly entityId: string;
}
