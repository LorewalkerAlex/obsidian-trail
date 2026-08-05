import type { TrailVaultReadResult } from "./trail-vault-reader";

export interface TrailRuntimeSnapshot {
  data: TrailVaultReadResult;
  isInitialized: boolean;
  isRefreshing: boolean;
}

export type TrailRuntimeReader = () => Promise<TrailVaultReadResult>;
export type TrailRuntimeListener = () => void;

const EMPTY_DATA: TrailVaultReadResult = {
  areas: [],
  projects: [],
  issues: [],
};

const DEFAULT_REFRESH_DELAY_MS = 100;

export class TrailRuntimeStore {
  private readonly listeners = new Set<TrailRuntimeListener>();
  private snapshot: TrailRuntimeSnapshot = {
    data: EMPTY_DATA,
    isInitialized: false,
    isRefreshing: false,
  };
  private refreshPromise: Promise<void> | null = null;
  private refreshRequested = false;
  private scheduledRefresh: number | null = null;
  private mutationDepth = 0;
  private disposed = false;

  constructor(
    private readonly readData: TrailRuntimeReader,
    private readonly refreshDelayMs = DEFAULT_REFRESH_DELAY_MS,
  ) {}

  readonly getSnapshot = (): TrailRuntimeSnapshot =>
    this.snapshot;

  readonly subscribe = (
    listener: TrailRuntimeListener,
  ): (() => void) => {
    if (this.disposed) {
      return () => undefined;
    }

    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  initialize(): Promise<void> {
    if (this.disposed) {
      return Promise.resolve();
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (this.snapshot.isInitialized) {
      return Promise.resolve();
    }

    return this.refresh();
  }

  refresh(): Promise<void> {
    if (this.disposed) {
      return Promise.resolve();
    }

    this.cancelScheduledRefresh();
    if (this.refreshPromise) {
      this.refreshRequested = true;
      return this.refreshPromise;
    }

    this.setSnapshot({
      ...this.snapshot,
      isRefreshing: true,
    });

    this.refreshPromise = this.runRefresh();

    return this.refreshPromise;
  }

  scheduleRefresh(): void {
    if (
      this.disposed
      || this.mutationDepth > 0
    ) {
      return;
    }

    this.cancelScheduledRefresh();
    this.scheduledRefresh = window.setTimeout(() => {
      this.scheduledRefresh = null;
      void this.refresh();
    }, this.refreshDelayMs);
  }

  async runMutation<Result>(
    mutation: () => Promise<Result>,
  ): Promise<Result> {
    if (this.disposed) {
      throw new Error("Trail runtime store is disposed.");
    }

    this.mutationDepth += 1;
    this.cancelScheduledRefresh();

    try {
      if (this.refreshPromise) {
        await this.refreshPromise;
      }

      return await mutation();
    } finally {
      this.mutationDepth -= 1;
      if (
        this.mutationDepth === 0
        && !this.disposed
      ) {
        await this.refresh();
      }
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.cancelScheduledRefresh();
    this.listeners.clear();
  }

  private async runRefresh(): Promise<void> {
    try {
      const data = await this.readData();
      if (!this.disposed) {
        this.setSnapshot({
          data,
          isInitialized: true,
          isRefreshing: false,
        });
      }
    } catch (error: unknown) {
      if (!this.disposed) {
        this.setSnapshot({
          data: readFailureResult(error),
          isInitialized: true,
          isRefreshing: false,
        });
      }
    } finally {
      this.refreshPromise = null;
      if (
        this.refreshRequested
        && !this.disposed
      ) {
        this.refreshRequested = false;
        await this.refresh();
      }
    }
  }

  private setSnapshot(
    snapshot: TrailRuntimeSnapshot,
  ): void {
    this.snapshot = snapshot;

    for (const listener of this.listeners) {
      listener();
    }
  }

  private cancelScheduledRefresh(): void {
    if (this.scheduledRefresh === null) {
      return;
    }

    window.clearTimeout(this.scheduledRefresh);
    this.scheduledRefresh = null;
  }
}

function readFailureResult(
  error: unknown,
): TrailVaultReadResult {
  const message = error instanceof Error
    ? error.message
    : "Unknown Vault read error.";

  return {
    areas: [],
    projects: [],
    issues: [
      {
        scope: "file",
        code: "vault.read.failed",
        message: `Trail could not read the Vault: ${message}`,
        filePath: "Trail",
      },
    ],
  };
}
