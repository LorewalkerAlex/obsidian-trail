import { describe, expect, it } from "vitest";

import {
  createTrailDiagnostics,
  type TrailDiagnosticPersistence,
} from "./trail-diagnostics";

interface ParsedDiagnosticEvent {
  readonly correlationId?: string;
  readonly data?: unknown;
  readonly name: string;
  readonly sequence: number;
  readonly sessionId?: string;
  readonly version?: number;
}

function parseDiagnosticEvent(line: string): ParsedDiagnosticEvent {
  const parsed: unknown = JSON.parse(line);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Diagnostic line is not an object");
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.name !== "string" || typeof record.sequence !== "number") {
    throw new Error("Diagnostic line is missing required fields");
  }

  return {
    correlationId: typeof record.correlationId === "string"
      ? record.correlationId
      : undefined,
    data: record.data,
    name: record.name,
    sequence: record.sequence,
    sessionId: typeof record.sessionId === "string"
      ? record.sessionId
      : undefined,
    version: typeof record.version === "number"
      ? record.version
      : undefined,
  };
}

function sessionIdFromLine(line: string): string | undefined {
  return parseDiagnosticEvent(line).sessionId;
}

class MemoryPersistence implements TrailDiagnosticPersistence {
  public readonly lines: string[] = [];
  public sessions: string[] = [];

  public async appendLine(line: string): Promise<void> {
    this.lines.push(line);
  }

  public async beginSession(sessionId: string): Promise<void> {
    this.sessions.push(sessionId);
  }

  public async readRecentSessions(): Promise<string> {
    return this.lines.join("");
  }

  public async replaceSession(
    sessionId: string,
    lines: readonly string[],
  ): Promise<void> {
    const previous = this.lines.filter(
      (line) => sessionIdFromLine(line) !== sessionId,
    );
    this.lines.splice(0, this.lines.length, ...previous, ...lines);
  }
}

describe("Trail structured diagnostics", () => {
  it("records one ordered session with correlation IDs and structured data", async () => {
    const persistence = new MemoryPersistence();
    let now = 100;
    const diagnostics = createTrailDiagnostics({
      createId: () => "session-a",
      now: () => now += 1,
      persistence,
    });

    const correlationId = diagnostics.createCorrelationId("triage.capture");
    diagnostics.record("command.created", {
      correlationId,
      data: {
        issueId: "issue-a",
        titleLength: 12,
      },
    });
    diagnostics.record("command.committed", { correlationId });

    await diagnostics.flush();

    const events = persistence.lines.map(parseDiagnosticEvent);
    expect(events.map((event) => event.name)).toEqual([
      "diagnostics.session.started",
      "command.created",
      "command.committed",
    ]);
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(events[1]).toMatchObject({
      correlationId: "session-a:triage.capture:1",
      data: {
        issueId: "issue-a",
        titleLength: 12,
      },
      sessionId: "session-a",
      version: 1,
    });
  });

  it("keeps recording non-blocking when diagnostic persistence fails", async () => {
    const diagnostics = createTrailDiagnostics({
      createId: () => "session-a",
      now: () => 1,
      persistence: {
        appendLine: () => Promise.reject(new Error("disk unavailable")),
        beginSession: () => Promise.reject(new Error("hidden folder unavailable")),
        readRecentSessions: () => Promise.reject(new Error("read unavailable")),
        replaceSession: () => Promise.reject(new Error("replace unavailable")),
      },
    });

    diagnostics.record("application.ready", {
      data: { timezone: "UTC" },
    });

    await expect(diagnostics.flush()).resolves.toBeUndefined();
    await expect(diagnostics.exportRecent()).resolves.toContain(
      '"name":"application.ready"',
    );
  });

  it("keeps only the latest 2000 events for a long current session", async () => {
    const persistence = new MemoryPersistence();
    let now = 0;
    const diagnostics = createTrailDiagnostics({
      createId: () => "session-long",
      now: () => now += 1,
      persistence,
    });

    for (let index = 0; index < 2_050; index += 1) {
      diagnostics.record("test.event", {
        data: { index },
      });
    }

    await diagnostics.flush();

    const persisted = persistence.lines.map(parseDiagnosticEvent);
    expect(persisted).toHaveLength(2_000);
    expect(persisted[0]?.sequence).toBe(52);
    expect(persisted[persisted.length - 1]?.sequence).toBe(2_051);

    const exported = (await diagnostics.exportRecent())
      .trim()
      .split("\n")
      .map(parseDiagnosticEvent);
    expect(exported).toHaveLength(2_000);
    expect(exported[0]?.sequence).toBe(52);
    expect(exported[exported.length - 1]?.sequence).toBe(2_051);
  });
});
