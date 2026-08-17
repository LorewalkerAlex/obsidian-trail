import { describe, expect, it } from "vitest";

import {
  createTrailDiagnostics,
  type TrailDiagnosticPersistence,
} from "./trail-diagnostics";

class MemoryPersistence implements TrailDiagnosticPersistence {
  public readonly lines: string[] = [];

  public appendLine(line: string): Promise<void> {
    this.lines.push(line);
    return Promise.resolve();
  }

  public beginSession(_sessionId: string): Promise<void> {
    return Promise.resolve();
  }

  public readRecentSessions(): Promise<string> {
    return Promise.resolve(this.lines.join(""));
  }

  public replaceSession(sessionId: string, lines: readonly string[]): Promise<void> {
    const previous = this.lines.filter((line) => {
      try {
        return (JSON.parse(line) as { sessionId?: unknown }).sessionId !== sessionId;
      } catch {
        return true;
      }
    });
    this.lines.splice(0, this.lines.length, ...previous, ...lines);
    return Promise.resolve();
  }
}

describe("Trail diagnostics", () => {
  it("records ordered structured events with stable correlations", async () => {
    const persistence = new MemoryPersistence();
    let now = 100;
    const diagnostics = createTrailDiagnostics({
      createId: () => "session-a",
      now: () => now += 1,
      persistence,
    });
    const correlationId = diagnostics.createCorrelationId("triage.capture");

    diagnostics.record("ui.triage.capture.submitted", {
      correlationId,
      data: { titleLength: 12 },
    });
    diagnostics.record("mutation.committed", { correlationId });
    await diagnostics.flush();

    const events = persistence.lines.map((line) => JSON.parse(line) as {
      correlationId?: string;
      name: string;
      sequence: number;
    });
    expect(events.map(({ name }) => name)).toEqual([
      "diagnostics.session.started",
      "ui.triage.capture.submitted",
      "mutation.committed",
    ]);
    expect(events.map(({ sequence }) => sequence)).toEqual([1, 2, 3]);
    expect(events[1]?.correlationId).toBe(correlationId);
  });

  it("never fails product work when persistence is unavailable", async () => {
    const diagnostics = createTrailDiagnostics({
      createId: () => "session-a",
      now: () => 1,
      persistence: {
        appendLine: () => Promise.reject(new Error("disk unavailable")),
        beginSession: () => Promise.reject(new Error("directory unavailable")),
        readRecentSessions: () => Promise.reject(new Error("read unavailable")),
        replaceSession: () => Promise.reject(new Error("replace unavailable")),
      },
    });

    diagnostics.record("runtime.control.changed", { data: { to: "ready" } });

    await expect(diagnostics.flush()).resolves.toBeUndefined();
    await expect(diagnostics.exportRecent()).resolves.toContain("runtime.control.changed");
  });
});
