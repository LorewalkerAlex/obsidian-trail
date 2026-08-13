import { describe, expect, it } from "vitest";

import {
  createTrailDiagnostics,
  type TrailDiagnosticPersistence,
} from "../diagnostics/trail-diagnostics";
import { TRAIL_TRIAGE_EMPTY_MARKDOWN } from "./trail-physical-schema";
import { TrailMutationQueue } from "./trail-mutation-queue";
import {
  createTrailRuntimeStore,
  selectEffectiveTriageIssueIds,
} from "./trail-runtime";
import {
  appendTriageIssueToMarkdown,
  parseTriageMarkdown,
  type TrailTriageParseResult,
  type TrailYamlParser,
} from "./trail-triage-markdown";
import {
  TrailTriageIntakeService,
  type TrailTriagePersistenceGateway,
} from "./trail-triage-intake";
import type { TrailTriageIssue } from "./trail-issue";

const FILE_PATH = "Trail/Collections/Triage.md";
const NOW = 1_786_464_000_000;

const parseYaml: TrailYamlParser = () => ({ kind: "triage" });

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

class MemoryTriagePersistence implements TrailTriagePersistenceGateway {
  public markdown = TRAIL_TRIAGE_EMPTY_MARKDOWN;
  public readonly appendCalls: string[] = [];
  public blockedIssueId?: string;
  public block?: Promise<void>;
  public readonly failIssueIds = new Set<string>();

  public async appendIssue(issue: TrailTriageIssue): Promise<TrailTriageParseResult> {
    this.appendCalls.push(issue.id);
    if (this.blockedIssueId === issue.id && this.block !== undefined) {
      await this.block;
    }
    if (this.failIssueIds.has(issue.id)) {
      throw new Error(`simulated write failure: ${issue.id}`);
    }

    this.markdown = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue,
      markdown: this.markdown,
      parseYaml,
    });
    return this.readLatest();
  }

  public async readLatest(): Promise<TrailTriageParseResult> {
    return parseTriageMarkdown({
      filePath: FILE_PATH,
      markdown: this.markdown,
      parseYaml,
    });
  }

  public appendExternal(issue: TrailTriageIssue): void {
    this.markdown = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue,
      markdown: this.markdown,
      parseYaml,
    });
  }
}

function createHarness(ids: string[]) {
  const store = createTrailRuntimeStore();
  const queue = new TrailMutationQueue();
  const persistence = new MemoryTriagePersistence();
  const service = new TrailTriageIntakeService(
    store,
    queue,
    persistence,
    {
      createId: () => {
        const id = ids.shift();
        if (id === undefined) {
          throw new Error("test ID queue exhausted");
        }
        return id;
      },
      now: () => NOW,
      resolveDefaultDue: (effectiveAt) => effectiveAt + 7,
    },
  );

  return { persistence, queue, service, store };
}

interface ParsedTriageDiagnosticEvent {
  readonly correlationId?: string;
  readonly data?: unknown;
  readonly name: string;
}

function parseDiagnosticEvent(line: string): ParsedTriageDiagnosticEvent {
  const parsed: unknown = JSON.parse(line);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Diagnostic line is not an object");
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.name !== "string") {
    throw new Error("Diagnostic line is missing an event name");
  }
  return {
    correlationId: typeof record.correlationId === "string"
      ? record.correlationId
      : undefined,
    data: record.data,
    name: record.name,
  };
}

describe("Formal Triage Intake vertical core", () => {
  it("publishes Quick Capture optimistically before persistence completes", async () => {
    const harness = createHarness(["command-a", "issue-a"]);
    await harness.service.initialize();
    const gate = deferred();
    harness.persistence.blockedIssueId = "issue-a";
    harness.persistence.block = gate.promise;

    const receipt = harness.service.capture({ title: "Review idea" });

    expect(selectEffectiveTriageIssueIds(harness.store.getState())).toEqual([
      "issue-a",
    ]);
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toBeUndefined();
    expect(harness.store.getState().pendingPlans).toHaveLength(1);

    gate.resolve();
    await receipt.completion;

    expect(harness.store.getState().pendingPlans).toEqual([]);
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toMatchObject({
      due: NOW + 7,
      title: "Review idea",
    });
    expect(harness.persistence.markdown).toContain("## Review idea");
    harness.queue.dispose();
  });

  it("keeps multiple captures optimistic while the global queue serializes writes", async () => {
    const harness = createHarness([
      "command-a",
      "issue-a",
      "command-b",
      "issue-b",
    ]);
    await harness.service.initialize();
    const gate = deferred();
    harness.persistence.blockedIssueId = "issue-a";
    harness.persistence.block = gate.promise;

    const first = harness.service.capture({ title: "First" });
    const second = harness.service.capture({ title: "Second" });

    expect([...selectEffectiveTriageIssueIds(harness.store.getState())].sort()).toEqual([
      "issue-a",
      "issue-b",
    ]);

    await Promise.resolve();
    expect(harness.persistence.appendCalls).toEqual(["issue-a"]);

    gate.resolve();
    await Promise.all([first.completion, second.completion]);

    expect(harness.persistence.appendCalls).toEqual(["issue-a", "issue-b"]);
    expect(Object.keys(harness.store.getState().committed.triageIssuesById).sort()).toEqual([
      "issue-a",
      "issue-b",
    ]);
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
    await harness.service.initialize();
    harness.persistence.failIssueIds.add("issue-a");

    const first = harness.service.capture({ title: "Will fail" });
    const firstFailure = first.completion.catch((error: unknown) => error);
    const second = harness.service.capture({ title: "Will survive" });

    await expect(second.completion).resolves.toBeUndefined();
    const failure = await firstFailure;

    expect(failure).toMatchObject({ code: "persistence-failed" });
    expect(harness.store.getState().committed.triageIssuesById["issue-a"]).toBeUndefined();
    expect(harness.store.getState().committed.triageIssuesById["issue-b"]?.title).toBe(
      "Will survive",
    );
    expect(harness.store.getState().pendingPlans).toEqual([]);
    harness.queue.dispose();
  });

  it("reconciles valid external edits and retains last-known-good state on invalid edits", async () => {
    const harness = createHarness([]);
    harness.persistence.appendExternal({
      context: "triage",
      due: NOW,
      id: "external",
      labelIds: [],
      title: "External",
    });
    await harness.service.initialize();
    const original = harness.store.getState().committed.triageIssuesById.external;

    harness.persistence.appendExternal({
      context: "triage",
      due: NOW + 1,
      id: "second",
      labelIds: [],
      title: "Second",
    });

    await expect(harness.service.refreshFromPersistence()).resolves.toBe(true);
    expect(harness.store.getState().committed.triageIssuesById.external).toBe(original);
    expect(harness.store.getState().committed.triageIssuesById.second).toBeDefined();

    harness.persistence.markdown = [
      "---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## Broken",
      '<!-- data {"id":"broken","context":"triage"} -->',
      "",
    ].join("\n");

    await expect(harness.service.refreshFromPersistence()).resolves.toBe(false);
    expect(harness.store.getState().committed.triageIssuesById.external).toBe(original);
    expect(harness.store.getState().committed.sourceIssues.length).toBeGreaterThan(0);
    harness.queue.dispose();
  });

  it("records the Quick Capture lifecycle without persisting title text in diagnostics", async () => {
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
    const ids = ["command-a", "issue-a"];
    const service = new TrailTriageIntakeService(
      store,
      queue,
      persistence,
      {
        createId: () => ids.shift() ?? "unexpected",
        now: () => NOW,
        resolveDefaultDue: (effectiveAt) => effectiveAt + 7,
      },
      diagnostics,
    );

    await service.initialize("initialize-a");
    const receipt = service.capture({ title: "Sensitive title text" });
    await receipt.completion;
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

  it("records privacy-preserving entity and field diffs for external reconciliation", async () => {
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
    persistence.appendExternal({
      context: "triage",
      due: NOW,
      id: "external",
      labelIds: [],
      title: "External title",
    });
    const service = new TrailTriageIntakeService(
      store,
      queue,
      persistence,
      {
        createId: () => "unused",
        now: () => NOW,
        resolveDefaultDue: (effectiveAt) => effectiveAt + 7,
      },
      diagnostics,
    );

    await service.initialize("initialize");
    persistence.markdown = persistence.markdown.replace(
      "## External title",
      "## External title edited",
    );
    await service.refreshFromPersistence("external-edit");
    await service.refreshFromPersistence("external-noop");
    await diagnostics.flush();

    const events = lines.map(parseDiagnosticEvent);
    const changed = events.find(
      (event) =>
        event.name === "runtime.triage.reconciled"
        && event.correlationId === "external-edit",
    );
    const noop = events.find(
      (event) =>
        event.name === "runtime.triage.reconciled"
        && event.correlationId === "external-noop",
    );

    expect(changed?.data).toMatchObject({
      addedIds: [],
      changedFieldsById: { external: ["title"] },
      changedIds: ["external"],
      removedIds: [],
    });
    expect(noop?.data).toMatchObject({
      addedIds: [],
      changedFieldsById: {},
      changedIds: [],
      removedIds: [],
    });
    expect(lines.join("")).not.toContain("External title edited");
    queue.dispose();
  });

});
