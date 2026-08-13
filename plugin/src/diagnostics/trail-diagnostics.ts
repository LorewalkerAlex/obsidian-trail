export type TrailDiagnosticLevel = "debug" | "info" | "warn" | "error";

export type TrailDiagnosticScalar = string | number | boolean | null;
export type TrailDiagnosticArray = readonly TrailDiagnosticScalar[];
export interface TrailDiagnosticObject {
  readonly [key: string]:
    | TrailDiagnosticScalar
    | TrailDiagnosticArray
    | TrailDiagnosticObject;
}
export type TrailDiagnosticValue =
  | TrailDiagnosticScalar
  | TrailDiagnosticArray
  | TrailDiagnosticObject;
export type TrailDiagnosticData = Readonly<Record<string, TrailDiagnosticValue>>;

export interface TrailDiagnosticEvent {
  readonly at: number;
  readonly correlationId?: string;
  readonly data?: TrailDiagnosticData;
  readonly level: TrailDiagnosticLevel;
  readonly name: string;
  readonly sequence: number;
  readonly sessionId: string;
  readonly version: 1;
}

export interface TrailDiagnosticRecordOptions {
  readonly correlationId?: string;
  readonly data?: TrailDiagnosticData;
  readonly level?: TrailDiagnosticLevel;
}

export interface TrailDiagnosticPersistence {
  readonly appendLine: (line: string) => Promise<void>;
  readonly beginSession: (sessionId: string) => Promise<void>;
  readonly readRecentSessions: (maxSessions: number) => Promise<string>;
  readonly replaceSession: (
    sessionId: string,
    lines: readonly string[],
  ) => Promise<void>;
}

export interface TrailDiagnostics {
  readonly enabled: boolean;
  createCorrelationId(prefix: string): string;
  dispose(): Promise<void>;
  exportRecent(maxSessions?: number): Promise<string>;
  flush(): Promise<void>;
  record(name: string, options?: TrailDiagnosticRecordOptions): void;
}

export interface TrailDiagnosticsOptions {
  readonly createId: () => string;
  readonly now: () => number;
  readonly persistence: TrailDiagnosticPersistence;
}

const MAX_IN_MEMORY_EVENTS = 2_000;
const MAX_PERSISTED_EVENTS_PER_SESSION = 2_000;
const PERSISTED_SNAPSHOT_INTERVAL = 250;
const DEFAULT_EXPORTED_SESSIONS = 2;

function serializeEvent(event: TrailDiagnosticEvent): string {
  return `${JSON.stringify(event)}\n`;
}

function normalizePrefix(prefix: string): string {
  const normalized = prefix.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  return normalized === "" ? "operation" : normalized;
}

function serializedSessionId(line: string): string | undefined {
  try {
    const value = JSON.parse(line) as { readonly sessionId?: unknown };
    return typeof value.sessionId === "string" ? value.sessionId : undefined;
  } catch {
    return undefined;
  }
}

function selectRecentSessions(text: string, maxSessions: number): string {
  if (maxSessions <= 0) {
    return "";
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const sessionIds: string[] = [];

  for (const line of lines) {
    const sessionId = serializedSessionId(line);
    if (sessionId !== undefined && !sessionIds.includes(sessionId)) {
      sessionIds.push(sessionId);
    }
  }

  const keep = new Set(sessionIds.slice(-maxSessions));
  const keptLines = lines.filter((line) => {
    const sessionId = serializedSessionId(line);
    return sessionId !== undefined && keep.has(sessionId);
  });

  return keptLines.length === 0 ? "" : `${keptLines.join("\n")}\n`;
}

function mergePersistedWithCurrentSession(
  persisted: string,
  sessionId: string,
  memoryEvents: readonly TrailDiagnosticEvent[],
  maxSessions: number,
): string {
  const previousLines = persisted
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) => line !== "" && serializedSessionId(line) !== sessionId,
    );
  const merged = [
    ...previousLines.map((line) => `${line}\n`),
    ...memoryEvents.map(serializeEvent),
  ].join("");

  return selectRecentSessions(merged, maxSessions);
}

function createNoopDiagnostics(): TrailDiagnostics {
  return {
    enabled: false,
    createCorrelationId: () => "diagnostics-disabled",
    dispose: () => Promise.resolve(),
    exportRecent: () => Promise.resolve(""),
    flush: () => Promise.resolve(),
    record: () => undefined,
  };
}

export const NOOP_TRAIL_DIAGNOSTICS: TrailDiagnostics = createNoopDiagnostics();

/**
 * Session-scoped structured diagnostic recorder. Recording is synchronous from
 * the caller's perspective; persistence is serialized behind the scenes and is
 * never allowed to participate in product correctness or mutation success.
 */
export function createTrailDiagnostics(
  options: TrailDiagnosticsOptions,
): TrailDiagnostics {
  const sessionId = options.createId();
  let correlationSequence = 0;
  let sequence = 0;
  let disposed = false;
  let writeTail = options.persistence.beginSession(sessionId).catch(() => undefined);
  const memoryEvents: TrailDiagnosticEvent[] = [];

  const enqueueLine = (line: string): void => {
    writeTail = writeTail
      .then(() => options.persistence.appendLine(line))
      .catch(() => undefined);
  };

  const enqueueCurrentSessionSnapshot = (): void => {
    const lines = memoryEvents.map(serializeEvent);
    writeTail = writeTail
      .then(() => options.persistence.replaceSession(sessionId, lines))
      .catch(() => undefined);
  };

  const record = (
    name: string,
    recordOptions: TrailDiagnosticRecordOptions = {},
  ): void => {
    if (disposed) {
      return;
    }

    const event: TrailDiagnosticEvent = {
      at: options.now(),
      correlationId: recordOptions.correlationId,
      data: recordOptions.data,
      level: recordOptions.level ?? "info",
      name,
      sequence: sequence += 1,
      sessionId,
      version: 1,
    };

    memoryEvents.push(event);
    if (memoryEvents.length > MAX_IN_MEMORY_EVENTS) {
      memoryEvents.shift();
    }

    if (sequence <= MAX_PERSISTED_EVENTS_PER_SESSION) {
      enqueueLine(serializeEvent(event));
      return;
    }

    const eventsPastCap = sequence - MAX_PERSISTED_EVENTS_PER_SESSION;
    if (
      eventsPastCap === 1
      || (eventsPastCap - 1) % PERSISTED_SNAPSHOT_INTERVAL === 0
    ) {
      enqueueCurrentSessionSnapshot();
    }
  };

  const flush = async (): Promise<void> => {
    if (sequence > MAX_PERSISTED_EVENTS_PER_SESSION) {
      enqueueCurrentSessionSnapshot();
    }
    await writeTail;
  };

  record("diagnostics.session.started", {
    data: { sessionId },
  });

  return {
    enabled: true,
    createCorrelationId(prefix: string): string {
      correlationSequence += 1;
      return `${sessionId}:${normalizePrefix(prefix)}:${correlationSequence}`;
    },
    async dispose(): Promise<void> {
      if (disposed) {
        return;
      }
      record("diagnostics.session.ended");
      disposed = true;
      await flush();
    },
    async exportRecent(maxSessions = DEFAULT_EXPORTED_SESSIONS): Promise<string> {
      await flush();
      try {
        const persisted = await options.persistence.readRecentSessions(maxSessions);
        return mergePersistedWithCurrentSession(
          persisted,
          sessionId,
          memoryEvents,
          maxSessions,
        );
      } catch {
        // Fall back to the current in-memory session. Diagnostics must never make
        // the product path fail just because its optional persistence is damaged.
        return memoryEvents.map(serializeEvent).join("");
      }
    },
    flush,
    record,
  };
}
