import type { TrailCustomViewId } from "./trail-values";

/**
 * Saved View selection keeps only the outer logical contract here.
 * Concrete filter, sort, group, and scope schemas are added only when product slices freeze them.
 */
export interface TrailSavedViewSelectionSpec {
  readonly entityType: string;
  readonly scope?: unknown;
  readonly filters?: unknown;
  readonly sort?: unknown;
  readonly group?: unknown;
}

/** Concrete Board/List/Table/etc. presentation schema is intentionally deferred. */
export type TrailPresentationSpec = Readonly<Record<string, unknown>>;

export interface TrailCustomViewConfig {
  readonly id: TrailCustomViewId;
  readonly name: string;
  readonly selection: TrailSavedViewSelectionSpec;
  readonly presentation: TrailPresentationSpec;
}

/** Favorite target kinds remain open until the complete target registry is frozen. */
export interface TrailFavoriteReference {
  readonly targetType: string;
  readonly targetId: string;
}

/** Home persistence ownership is frozen; its exact module/layout schema is still deferred. */
export type TrailHomeComposition = Readonly<Record<string, unknown>>;

export interface TrailWorkspaceState {
  readonly customViews: readonly TrailCustomViewConfig[];
  /** Array order is authoritative user ordering. */
  readonly favorites: readonly TrailFavoriteReference[];
  readonly home: TrailHomeComposition;
}
