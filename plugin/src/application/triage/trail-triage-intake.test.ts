import { describe, expect, it } from "vitest";

import {
  createTrailDiagnostics,
  type TrailDiagnosticPersistence,
} from "../../diagnostics/trail-diagnostics";
import type { TrailTriageIssue } from "../../domain/trail-issue";
import { TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import type { TrailTriageSourceResult } from "../../persistence/domain-sources/trail-source-result";
import type { TrailTriagePersistence } from "../../persistence/domain-sources/trail-triage-persistence";
import {
  selectEffectiveTriageIssueIds,
} from "../../runtime/projection/trail-runtime-projection";
import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailTriageSourceSync } from "../../source-sync/triage/trail-triage-source-sync";
import { TrailTriageIntakeService } from "./trail-triage-intake";

const NOW = 1_786_464_000_000;

interface Deferred {
  readonly promise: Promise<void>;
  resolve(): void;
}

function deferred(): Deferred {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: () => resolvePromise?.(),
  };
}

class MemoryTriagePersistence implements TrailTriagePersistence {
  private readonly issues = new Map<string, TrailTriageIssue>();
  public readonly appendCalls: string[] = [];
  public blockedIssueId?: string;
  public block?: Promise<void>;
  public readonly failIssueIds = new Set<string>();

  public async appendIssue(issue: TrailTriageIssue): Promise<TrailTriageSourceResult> {
    this.appendCalls.push(issue.id);
    if (this.blockedIssueId === issue.id && this.block !== undefined) {
      await this.block;
    }
    if (this.failIssueIds.has(issue.id)) {
      throw new Error(`simulated write failure: ${issue.id}`);
    }
    this.issues.set(issue.id, issue);
    return this.readLatest();
  }

  public async deleteIssue(expectedIssue: TrailTriageIssue): Promise<TrailTriageSourceResult> {
    this.issues.delete(expectedIssue.id);
    return this.readLatest();
  }

  public async readLatest(): Promise<TrailTriageSourceResult> {
    return {
      contribution: {
        filePath: TRAIL_TRIAGE_PATH,
        issuesById: Object.fromEntries(this.issues),
      },
      issues: [],
    };
  }

  public async updateIssue(
    _expectedIssue: TrailTriageIssue,
    issue: TrailTriageIssue,
  ): Promise<TrailTriageSourceResult> {
    this.issues.set(issue.id, issue);
    return this.readLatest();
  }
}

function createHarness(ids: string[]) {
  const store = createTrailRuntimeStore();
  const queue = new TrailMutationQueue();
  const persistence = new MemoryTriagePersistence();
  const sourceSync = new TrailTriageSourceSync(store, queue, persistence);
  const service = new TrailTriageIntakeService(
    store,
    sourceSync,
    {
      createId: () => {
        const id = ids.shift();
        if (id === undefined) throw new Error("test ID queue exhausted");
        return id;
      },
      now: () => NOW,
      resolveDefaultDue: (effectiveAt) => effectiveAt + 7,
    },
  );
  return { persistence, queue, service, sourceSync, store };
}

interface ParsedDiagnosticEvent {
  readonly name: string;
}

function parseDiagnosticEvent(line: string): ParsedDiagnosticEvent {
  const parsed: unknown = JSON.parse(line);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Diagnostic line is not an object");
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.name !== "string") {
    throw new Error("Diagnostic line is missing an event name");
  }
  return { name: record.name };
}

describe("Triage Intake application", () => {
  it("publishes Quick Capture optimistically before persistence completes", async () => {
    const harness = createHarness(["command-a", "issue-a"]);
    await harness.sourceSync.initialize();
    const gate = deferred();
    harness.persistence.blockedIssueId = "issue-a";
    harness.persistence.block = gate.promise;

    const receipt = harness.service.capture({ title: "Review idea" });

    expect(selectEffectiveTriageIssueIds(harness.store.getState())).toEqual(["issue-a"]);
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toBeUndefined();
    expect(harness.store.getState().pendingPlans).toHaveLength(1);

    gate.resolve();
    await receipt.completion;

    expect(harness.store.getState().pendingPlans).toEqual([]);
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toMatchObject({
      due: NOW + 7,
      title: "Review idea",
    });
    harness.queue.dispose();
  });

  it("keeps multiple captures optimistic while the global queue serializes writes", async () => {
    const harness = createHarness([
      "command-a",
      "issue-a",
      "command-b",
      "issue-b",
    ]);
    await harness.sourceSync.initialize();
    const gate = deferred();
    harness.persistence.blockedIssueId = "issue-a";
    harness.persistence.block = gate.promise;

    const first = harness.service.capture({ title: "First" });
    const second = harness.service.capture({ title: "Second" });

    expect([...selectEffectiveTriageIssueIds(harness.store.getState())].sort()).toEqual([
      "issue-a",
      "issue-b",
    ]);
    for (
      let attempt = 0;
      attempt < 10 && harness.persistence.appendCalls.length === 0;
      attempt += 1
    ) {
      await Promise.resolve();
    }
    expect(harness.persistence.appendCalls).toEqual(["issue-a"]);

    gate.resolve();
    await Promise.all([first.completion, second.completion]);
    expect(harness.persistence.appendCalls).toEqual(["issue-a", "issue-b"]);
    expect(harness.store.getState().pendingPlans).toEqual([]);
    harness.queue.dispose();
  });

  it("removes a failed optimistic plan and lets a later queued capture continue", async () => {
    const harness = createHarness([
      "command-a",
      "issue-a",
      "command-b",
      "issue-b",
    ]);
    await harness.sourceSync.initialize();
    harness.persistence.failIssueIds.add("issue-a");

    const first = harness.service.capture({ title: "Will fail" });
    const firstFailure = first.completion.catch((error: unknown) => error);
    const second = harness.service.capture({ title: "Will survive" });

    await expect(second.completion).resolves.toBeUndefined();
    expect(await firstFailure).toMatchObject({ code: "persistence-failed" });
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toBeUndefined();
    expect(harness.store.getState().committed.triageIssuesById["issue-b"]?.title).toBe(
      "Will survive",
    );
    harness.queue.dispose();
  });

  it("records the Quick Capture lifecycle without persisting title text", async () => {
    const lines: string[] = [];
    const diagnosticPersistence: TrailDiagnosticPersistence = {
      appendLine: async (line) => {
        lines.push(line);
      },
      beginSession: async () => undefined,
      readRecentSessions: async () => lines.join(""),
      replaceSession: async () => undefined,
    };
    const diagnostics = createTrailDiagnostics({
      createId: () => "diagnostic-session",
      now: () => NOW,
      persistence: diagnosticPersistence,
    });
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue(diagnostics);
    const persistence = new MemoryTriagePersistence();
    const sourceSync = new TrailTriageSourceSync(store, queue, persistence, diagnostics);
    const ids = ["command-a", "issue-a"];
    const service = new TrailTriageIntakeService(
      store,
      sourceSync,
      {
        createId: () => ids.shift() ?? "unexpected",
        now: () => NOW,
        resolveDefaultDue: (effectiveAt) => effectiveAt + 7,
      },
      diagnostics,
    );

    await sourceSync.initialize("initialize-a");
    await service.capture({ title: "Sensitive title text" }).completion;
    await diagnostics.flush();

    const trace = lines.join("");
    const names = lines
      .map(parseDiagnosticEvent)
      .map((event) => event.name)
      .filter((name) => name !== "diagnostics.session.started");
    expect(names).toContain("command.created");
    expect(names).toContain("command.planned");
    expect(names).toContain("runtime.optimistic.applied");
    expect(names).toContain("triage.persistence.write.started");
    expect(names).toContain("runtime.triage.reconciled");
    expect(names).toContain("runtime.optimistic.removed");
    expect(names).toContain("command.committed");
    expect(trace).not.toContain("Sensitive title text");
    expect(trace).toContain('"titleLength":20');
    queue.dispose();
  });
});
