import { describe, expect, it } from "vitest";

import {
  createTrailDiagnostics,
  type TrailDiagnosticPersistence,
} from "../../diagnostics/trail-diagnostics";
import {
  sameTrailTriageIssue,
  type TrailTriageIssue,
} from "../../domain/trail-issue";
import { TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import type { TrailTriageSourceResult } from "../../persistence/domain-sources/trail-source-result";
import {
  TrailTriagePersistenceError,
  type TrailTriagePersistence,
} from "../../persistence/domain-sources/trail-triage-persistence";
import {
  selectEffectiveTriageIssueById,
  selectEffectiveTriageIssueIds,
} from "../../runtime/projection/trail-runtime-projection";
import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailTriageSourceSync } from "../../source-sync/triage/trail-triage-source-sync";
import {
  planTriageManagement,
  TrailTriageManagementService,
  type TriageManagementCommandEnvironment,
} from "./trail-triage-management";

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

class MemoryManagementPersistence implements TrailTriagePersistence {
  private readonly issues = new Map<string, TrailTriageIssue>();
  public block?: Promise<void>;
  public readonly deleteCalls: string[] = [];
  public readonly updateCalls: string[] = [];

  public seed(issue: TrailTriageIssue): void {
    this.issues.set(issue.id, issue);
  }

  public appendIssue(issue: TrailTriageIssue): Promise<TrailTriageSourceResult> {
    this.issues.set(issue.id, issue);
    return this.readLatest();
  }

  public async deleteIssue(
    expectedIssue: TrailTriageIssue,
  ): Promise<TrailTriageSourceResult> {
    this.deleteCalls.push(expectedIssue.id);
    if (this.block !== undefined) await this.block;
    const current = this.issues.get(expectedIssue.id);
    if (current === undefined || !sameTrailTriageIssue(current, expectedIssue)) {
      throw new TrailTriagePersistenceError("conflict", "external change");
    }
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
    expectedIssue: TrailTriageIssue,
    issue: TrailTriageIssue,
  ): Promise<TrailTriageSourceResult> {
    this.updateCalls.push(issue.id);
    if (this.block !== undefined) await this.block;
    const current = this.issues.get(expectedIssue.id);
    if (current === undefined || !sameTrailTriageIssue(current, expectedIssue)) {
      throw new TrailTriagePersistenceError("conflict", "external change");
    }
    this.issues.set(issue.id, issue);
    return this.readLatest();
  }

  public editExternal(issue: TrailTriageIssue): void {
    this.issues.set(issue.id, issue);
  }
}

function createEnvironment(ids: string[]): TriageManagementCommandEnvironment {
  return {
    createId: () => ids.shift() ?? "unexpected-command",
    now: () => NOW,
  };
}

async function createHarness(ids: string[] = ["command-a"]) {
  const store = createTrailRuntimeStore();
  const queue = new TrailMutationQueue();
  const persistence = new MemoryManagementPersistence();
  persistence.seed({
    context: "triage",
    description: "Body.",
    due: NOW + 100,
    id: "issue-a",
    labelIds: [],
    title: "Original",
  });
  const sourceSync = new TrailTriageSourceSync(store, queue, persistence);
  await sourceSync.initialize();
  const service = new TrailTriageManagementService(
    store,
    sourceSync,
    createEnvironment(ids),
  );
  return { persistence, queue, service, sourceSync, store };
}

interface ParsedDiagnosticEvent {
  readonly correlationId?: string;
  readonly data?: unknown;
  readonly name: string;
}

function parseDiagnosticEvent(line: string): ParsedDiagnosticEvent {
  const parsed: unknown = JSON.parse(line);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Diagnostic line is not an object");
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.name !== "string") {
    throw new Error("Diagnostic line is missing a name");
  }
  return {
    correlationId: typeof record.correlationId === "string"
      ? record.correlationId
      : undefined,
    data: record.data,
    name: record.name,
  };
}

describe("Triage Management application", () => {
  it("plans edit/defer/delete from the current Effective Issue", () => {
    const current: TrailTriageIssue = {
      context: "triage",
      due: 10,
      id: "issue-a",
      labelIds: [],
      title: "A",
    };

    expect(planTriageManagement(current, {
      commandId: "edit",
      due: 20,
      effectiveAt: NOW,
      expectedIssue: current,
      issueId: "issue-a",
      kind: "triage.edit",
      title: "Edited",
    })).toMatchObject({
      expectedIssue: current,
      kind: "ready",
      nextIssue: { due: 20, title: "Edited" },
      plan: { intent: "triage.issue.replace" },
    });
    expect(planTriageManagement(current, {
      commandId: "defer",
      due: 30,
      effectiveAt: NOW,
      expectedIssue: current,
      issueId: "issue-a",
      kind: "triage.defer",
    })).toMatchObject({ kind: "ready" });
    expect(planTriageManagement(current, {
      commandId: "delete",
      effectiveAt: NOW,
      expectedIssue: current,
      issueId: "issue-a",
      kind: "triage.delete",
    })).toMatchObject({
      expectedIssue: current,
      kind: "ready",
      plan: { intent: "triage.issue.delete" },
    });
  });

  it("shows an edit optimistically before persistence and commits the verified result", async () => {
    const harness = await createHarness();
    const gate = deferred();
    harness.persistence.block = gate.promise;

    const expectedIssue = harness.store.getState().committed.triageIssuesById["issue-a"];
    const receipt = harness.service.edit({
      due: NOW + 50,
      expectedIssue,
      title: "Edited",
    });

    expect(selectEffectiveTriageIssueById(
      harness.store.getState(),
      "issue-a",
    )).toMatchObject({ due: NOW + 50, title: "Edited" });
    expect(harness.store.getState().committed.triageIssuesById["issue-a"].title).toBe(
      "Original",
    );

    gate.resolve();
    await receipt.completion;
    expect(harness.store.getState().pendingPlans).toEqual([]);
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toMatchObject({
      due: NOW + 50,
      title: "Edited",
    });
    harness.queue.dispose();
  });

  it("projects delete immediately and removes the committed record after verification", async () => {
    const harness = await createHarness();
    const gate = deferred();
    harness.persistence.block = gate.promise;

    const receipt = harness.service.delete(
      harness.store.getState().committed.triageIssuesById["issue-a"],
    );
    expect(selectEffectiveTriageIssueIds(harness.store.getState())).toEqual([]);
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toBeDefined();

    gate.resolve();
    await receipt.completion;
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toBeUndefined();
    expect(harness.store.getState().pendingPlans).toEqual([]);
    harness.queue.dispose();
  });

  it("rejects defer that does not move Due later", async () => {
    const harness = await createHarness();
    expect(() => harness.service.defer({
      due: NOW,
      expectedIssue: harness.store.getState().committed.triageIssuesById["issue-a"],
    })).toThrow("Triage Defer must move Due later");
    expect(harness.persistence.updateCalls).toEqual([]);
    harness.queue.dispose();
  });

  it("reconciles an external conflict and removes the optimistic edit", async () => {
    const harness = await createHarness();
    const expected = harness.store.getState().committed.triageIssuesById["issue-a"];
    harness.persistence.editExternal({ ...expected, title: "External" });

    const receipt = harness.service.edit({
      due: expected.due,
      expectedIssue: expected,
      title: "Local",
    });

    await expect(receipt.completion).rejects.toMatchObject({ code: "conflict" });
    expect(harness.store.getState().pendingPlans).toEqual([]);
    expect(harness.store.getState().committed.triageIssuesById["issue-a"].title).toBe(
      "External",
    );
    harness.queue.dispose();
  });

  it("records management lifecycle and field diffs without persisting title text", async () => {
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
    const persistence = new MemoryManagementPersistence();
    persistence.seed({
      context: "triage",
      due: NOW + 100,
      id: "issue-a",
      labelIds: [],
      title: "Sensitive original",
    });
    const sourceSync = new TrailTriageSourceSync(store, queue, persistence, diagnostics);
    await sourceSync.initialize();
    const service = new TrailTriageManagementService(
      store,
      sourceSync,
      createEnvironment(["command-a"]),
      diagnostics,
    );

    await service.edit({
      due: NOW + 200,
      expectedIssue: store.getState().committed.triageIssuesById["issue-a"],
      title: "Sensitive edited title",
    }).completion;
    await diagnostics.flush();

    const trace = lines.join("");
    const reconciled = lines
      .map(parseDiagnosticEvent)
      .find((event) =>
        event.name === "runtime.triage.reconciled"
        && event.correlationId === "command-a"
      );
    expect(reconciled?.data).toMatchObject({
      changedFieldsById: { "issue-a": ["due", "title"] },
      changedIds: ["issue-a"],
    });
    expect(trace).not.toContain("Sensitive original");
    expect(trace).not.toContain("Sensitive edited title");
    expect(trace).toContain('"titleLength":22');
    queue.dispose();
  });
});
