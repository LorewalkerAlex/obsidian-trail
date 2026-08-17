export type TrailMutationQueueCommand<TResult> = () => Promise<TResult>;

export class TrailMutationQueueDisposedError extends Error {
  public constructor() {
    super("The Trail mutation queue has been disposed.");
    this.name = "TrailMutationQueueDisposedError";
  }
}

interface QueuedMutation {
  readonly reject: (error: unknown) => void;
  readonly run: () => Promise<void>;
}

/** One global FIFO persistence lane; optimistic UI is intentionally outside this queue. */
export class TrailMutationQueue {
  private readonly queued: QueuedMutation[] = [];
  private running = false;
  private disposed = false;

  public enqueue<TResult>(command: TrailMutationQueueCommand<TResult>): Promise<TResult> {
    return this.enqueueInternal(command, "tail");
  }

  /** Inserts recovery/refresh work immediately after the currently running command. */
  public enqueueAfterCurrent<TResult>(command: TrailMutationQueueCommand<TResult>): Promise<TResult> {
    return this.enqueueInternal(command, "front");
  }

  private enqueueInternal<TResult>(
    command: TrailMutationQueueCommand<TResult>,
    position: "front" | "tail",
  ): Promise<TResult> {
    if (this.disposed) return Promise.reject(new TrailMutationQueueDisposedError());
    return new Promise<TResult>((resolve, reject) => {
      const mutation: QueuedMutation = {
        reject,
        run: async () => { resolve(await command()); },
      };
      if (position === "front") this.queued.unshift(mutation);
      else this.queued.push(mutation);
      void this.drain();
    });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const error = new TrailMutationQueueDisposedError();
    for (const mutation of this.queued.splice(0)) mutation.reject(error);
  }

  private async drain(): Promise<void> {
    if (this.running || this.disposed) return;
    this.running = true;
    try {
      while (!this.disposed) {
        const mutation = this.queued.shift();
        if (mutation === undefined) return;
        try {
          await mutation.run();
        } catch (error: unknown) {
          mutation.reject(error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
