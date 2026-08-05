import type { TrailTask } from "./trail-model";
import type { TrailTaskStatusMutationInput } from "./trail-mutation-service";

export type TrailTaskStatusMutationExecutor = (
  input: TrailTaskStatusMutationInput,
) => Promise<TrailTask>;

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

interface QueuedTaskStatusMutation {
  input: TrailTaskStatusMutationInput;
  resolve(task: TrailTask): void;
  reject(error: unknown): void;
}

export class TrailMutationQueue {
  private readonly pending: QueuedTaskStatusMutation[] = [];
  private isRunning = false;
  private disposed = false;

  constructor(
    private readonly executeTaskStatus:
      TrailTaskStatusMutationExecutor,
  ) {}

  enqueueTaskStatus(
    input: TrailTaskStatusMutationInput,
  ): Promise<TrailTask> {
    if (this.disposed) {
      return Promise.reject(createDisposedError());
    }

    return new Promise<TrailTask>((resolve, reject) => {
      this.pending.push({
        input,
        resolve,
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
          const task = await this.executeTaskStatus(
            mutation.input,
          );

          mutation.resolve(task);
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
