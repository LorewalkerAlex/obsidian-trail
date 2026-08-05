export type TrailMutationCommand<Result> = () => Promise<Result>;

export type TrailMutationQueueErrorCode =
  | "queue-disposed";

export class TrailMutationQueueError extends Error {
  constructor(
    readonly code: TrailMutationQueueErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailMutationQueueError";
  }
}

interface QueuedMutation {
  run(): Promise<void>;
  reject(error: unknown): void;
}

export class TrailMutationQueue {
  private readonly pending: QueuedMutation[] = [];
  private isRunning = false;
  private disposed = false;

  enqueue<Result>(
    command: TrailMutationCommand<Result>,
  ): Promise<Result> {
    if (this.disposed) {
      return Promise.reject(createDisposedError());
    }

    return new Promise<Result>((resolve, reject) => {
      this.pending.push({
        run: async () => {
          resolve(await command());
        },
        reject,
      });

      void this.run();
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    const error = createDisposedError();

    for (const mutation of this.pending.splice(0)) {
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

        try {
          await mutation.run();
        } catch (error: unknown) {
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
