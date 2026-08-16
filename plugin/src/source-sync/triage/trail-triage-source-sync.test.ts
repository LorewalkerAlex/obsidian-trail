import { describe, expect, it } from "vitest";

import {
  sameTrailTriageIssue,
  type TrailTriageIssue,
} from "../../domain/trail-issue";
import { TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import type { TrailSingleTransactionPlan } from "../../mutation/physical/trail-single-transaction-plan";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import type { TrailTriageSourceResult } from "../../persistence/domain-sources/trail-source-result";
import {
  TrailTriagePersistenceError,
  type TrailTriagePersistence,
} from "../../persistence/domain-sources/trail-triage-persistence";
import {
  selectEffectiveTriageIssueById,
} from "../../runtime/projection/trail-runtime-projection";
import {
  createTrailRuntimeStore,
  selectSourceIssuesForPath,
} from "../../runtime/store/trail-runtime-store";
import { TrailTriageSourceSync } from "./trail-triage-source-sync";

class MemoryTriagePersistence implements TrailTriagePersistence {
  private readonly issues = new Map<string, TrailTriageIssue>();
  private invalid = false;

  public appendIssue(issue: TrailTriageIssue): Promise<TrailTriageSourceResult> {
    if (this.issues.has(issue.id)) {
      throw new TrailTriagePersistenceError("duplicate-id", "duplicate");
    }
    this.issues.set(issue.id, issue);
    return this.readLatest();
  }

  public deleteIssue(expectedIssue: TrailTriageIssue): Promise<TrailTriageSourceResult> {
    const current = this.issues.get(expectedIssue.id);
    if (current === undefined || !sameTrailTriageIssue(current, expectedIssue)) {
      throw new TrailTriagePersistenceError("conflict", "changed");
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
      issues: this.invalid
        ? [{
            code: "test.invalid-source",
            filePath: TRAIL_TRIAGE_PATH,
            message: "invalid fixture",
            scope: "file",
          }]
        : [],
    };
  }

  public updateIssue(
    expectedIssue: TrailTriageIssue,
    issue: TrailTriageIssue,
  ): Promise<TrailTriageSourceResult> {
    const current = this.issues.get(expectedIssue.id);
    if (current === undefined || !sameTrailTriageIssue(current, expectedIssue)) {
      throw new TrailTriagePersistenceError("conflict", "changed");
    }
    this.issues.set(issue.id, issue);
    return this.readLatest();
  }

  public setExternal(issue: TrailTriageIssue): void {
    this.issues.set(issue.id, issue);
  }

  public setInvalid(invalid: boolean): void {
    this.invalid = invalid;
  }
}

describe("Triage Source Sync", () => {
  it("loads and refreshes the authoritative Triage source", async () => {
    const persistence = new MemoryTriagePersistence();
    persistence.setExternal({
      context: "triage",
      due: 100,
      id: "issue-a",
      labelIds: [],
      title: "Initial",
    });
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue();
    const sourceSync = new TrailTriageSourceSync(store, queue, persistence);

    await sourceSync.initialize();
    expect(selectEffectiveTriageIssueById(store.getState(), "issue-a")?.title).toBe("Initial");

    persistence.setExternal({
      context: "triage",
      due: 100,
      id: "issue-a",
      labelIds: [],
      title: "External edit",
    });
    await expect(sourceSync.refresh()).resolves.toBe(true);
    expect(store.getState().committed.authoritative.domain.issuesById["issue-a"].title).toBe("External edit");
    queue.dispose();
  });

  it("keeps last-known-good state when the external source becomes invalid", async () => {
    const persistence = new MemoryTriagePersistence();
    persistence.setExternal({
      context: "triage",
      due: 100,
      id: "issue-a",
      labelIds: [],
      title: "Keep me",
    });
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue();
    const sourceSync = new TrailTriageSourceSync(store, queue, persistence);
    await sourceSync.initialize();

    persistence.setInvalid(true);
    const revision = store.getState().committed.revision;
    await expect(sourceSync.refresh()).resolves.toBe(false);

    expect(store.getState().committed.authoritative.domain.issuesById["issue-a"].title).toBe("Keep me");
    expect(store.getState().committed.revision).toBe(revision);
    expect(selectSourceIssuesForPath(store.getState(), TRAIL_TRIAGE_PATH)).toEqual([
      expect.objectContaining({ code: "test.invalid-source" }),
    ]);
    queue.dispose();
  });

  it("owns transition preflight, execution, observation, and reconciliation", async () => {
    const source: TrailTriageIssue = {
      context: "triage",
      due: 100,
      id: "issue-a",
      labelIds: [],
      title: "Accept me",
    };
    const persistence = new MemoryTriagePersistence();
    persistence.setExternal(source);
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue();
    const sourceSync = new TrailTriageSourceSync(store, queue, persistence);
    await sourceSync.initialize();

    const plan: TrailSingleTransactionPlan = {
      commandId: "accept-a",
      intent: "triage.accept",
      operation: {
        expectedIssue: source,
        kind: "triage-delete",
      },
      sourcePath: TRAIL_TRIAGE_PATH,
    };

    await expect(sourceSync.preflightTransitionPlan(plan, "accept-a")).resolves.toBeUndefined();
    const persisted = await sourceSync.executeTransitionPlan(plan, "accept-a");
    expect(persisted.issuesById["issue-a"]).toBeUndefined();
    await expect(sourceSync.observeTransitionPlan(plan)).resolves.toMatchObject({
      kind: "absent",
    });

    sourceSync.reconcileTransitionSnapshot(persisted, "triage.accept", "accept-a");
    expect(store.getState().committed.authoritative.domain.issuesById["issue-a"]).toBeUndefined();
    queue.dispose();
  });
});
