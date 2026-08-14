import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";

export type TrailMutationCommand<Result> = () => Promise<Result>;

export interface TrailMutationQueueMetadata {
  readonly correlationId?: string;
  readonly kind?: string;
}

export type TrailMutationQueueErrorCode =
  | "queue-disposed";

export class TrailMutationQueueError extends Error {
  public constructor(
    readonly code: TrailMutationQueueErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailMutationQueueError";
  }
}

interface QueuedMutation {
  readonly metadata?: TrailMutationQueueMetadata;
  reject(error: unknown): void;
  run(): Promise<void>;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export class TrailMutationQueue {
  private readonly pending: QueuedMutation[] = [];
  private isRunning = false;
  private disposed = false;

  public constructor(
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public enqueue<Result>(
    command: TrailMutationCommand<Result>,
    metadata?: TrailMutationQueueMetadata,
  ): Promise<Result> {
    if (this.disposed) {
      this.diagnostics.record("mutation.queue.rejected", {
        correlationId: metadata?.correlationId,
        data: {
          kind: metadata?.kind ?? null,
          reason: "queue-disposed",
        },
        level: "warn",
      });
      return Promise.reject(createDisposedError());
    }

    return new Promise<Result>((resolve, reject) => {
      this.pending.push({
        metadata,
        run: async () => {
          resolve(await command());
        },
        reject,
      });
      this.diagnostics.record("mutation.queue.enqueued", {
        correlationId: metadata?.correlationId,
        data: {
          kind: metadata?.kind ?? null,
          pendingCount: this.pending.length,
        },
      });

      void this.run();
    });
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.diagnostics.record("mutation.queue.disposed", {
      data: { queuedCount: this.pending.length },
    });

    const error = createDisposedError();

    for (const mutation of this.pending.splice(0)) {
      this.diagnostics.record("mutation.queue.rejected", {
        correlationId: mutation.metadata?.correlationId,
        data: {
          kind: mutation.metadata?.kind ?? null,
          reason: "queue-disposed",
        },
        level: "warn",
      });
      mutation.reject(error);
    }
  }

  private async run(): Promise<void> {
    if (this.isRunning || this.disposed) {
      return;
    }

    this.isRunning = true;

    try {
      while (!this.disposed) {
        const mutation = this.pending.shift();

        if (!mutation) {
          return;
        }

        this.diagnostics.record("mutation.queue.started", {
          correlationId: mutation.metadata?.correlationId,
          data: {
            kind: mutation.metadata?.kind ?? null,
            queuedBehind: this.pending.length,
          },
        });

        try {
          await mutation.run();
          this.diagnostics.record("mutation.queue.completed", {
            correlationId: mutation.metadata?.correlationId,
            data: {
              kind: mutation.metadata?.kind ?? null,
              queuedBehind: this.pending.length,
            },
          });
        } catch (error: unknown) {
          this.diagnostics.record("mutation.queue.failed", {
            correlationId: mutation.metadata?.correlationId,
            data: {
              errorName: errorName(error),
              kind: mutation.metadata?.kind ?? null,
              queuedBehind: this.pending.length,
            },
            level: "error",
          });
          mutation.reject(error);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}

function createDisposedError(): TrailMutationQueueError {
  return new TrailMutationQueueError(
    "queue-disposed",
    "The Trail mutation queue has been disposed.",
  );
}
