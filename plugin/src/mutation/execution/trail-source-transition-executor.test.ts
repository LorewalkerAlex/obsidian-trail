import { describe, expect, it } from "vitest";

import type { TrailSingleTransactionPlan } from "../physical/trail-single-transaction-plan";
import type { TrailSourceTransitionPlan } from "../physical/trail-source-transition-plan";
import {
  executeTrailSourceTransition,
  type TrailTransitionObservation,
} from "./trail-source-transition-executor";

const sourcePlan: TrailSingleTransactionPlan = {
  commandId: "command-a",
  intent: "test.transition",
  operation: {
    expectedIssue: {
      context: "triage",
      due: 1,
      id: "source-a",
      labelIds: [],
      title: "Source",
    },
    kind: "triage-delete",
  },
  sourcePath: "Trail/Collections/Triage.md",
};

const targetIssue = {
  context: "workflow" as const,
  createdAt: 1,
  id: "target-a",
  labelIds: [],
  projectId: "project-a",
  statusDefinitionId: "issue-backlog",
  title: "Target",
};

const targetPlan: TrailSingleTransactionPlan = {
  commandId: "command-a",
  intent: "test.transition",
  operation: {
    expectedProject: {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-open",
      title: "Project",
    },
    issue: targetIssue,
    kind: "workflow-create",
  },
  sourcePath: "Trail/Projects/0001 Project.md",
};

const compensationPlan: TrailSingleTransactionPlan = {
  ...targetPlan,
  operation: {
    expectedIssue: targetIssue,
    kind: "workflow-delete",
  },
};

const plan: TrailSourceTransitionPlan = {
  commandId: "command-a",
  compensation: compensationPlan,
  intent: "test.transition",
  source: sourcePlan,
  target: targetPlan,
};

function observation<T>(
  kind: "absent" | "present",
  value: T,
): TrailTransitionObservation<T> {
  return { kind, value };
}

describe("Trail Source Transition executor", () => {
  it("verifies target before running the destructive source operation", async () => {
    const events: string[] = [];
    const outcome = await executeTrailSourceTransition(plan, {
      compensateTarget: async () => {
        events.push("compensate");
        return "target-compensated";
      },
      executeSource: async () => {
        events.push("source-delete");
        return "source-absent";
      },
      executeTarget: async () => {
        events.push("target-create-verified");
        return "target-present";
      },
      observeSource: async () => observation("absent", "source-absent"),
      observeTarget: async () => observation("present", "target-present"),
      preflight: async () => {
        events.push("preflight");
      },
    });

    expect(events).toEqual([
      "preflight",
      "target-create-verified",
      "source-delete",
    ]);
    expect(outcome).toEqual({
      kind: "committed",
      recovered: false,
      source: "source-absent",
      target: "target-present",
    });
  });

  it("returns unchanged when a failed target operation is authoritatively absent", async () => {
    const events: string[] = [];
    const failure = new Error("target write failed");
    const outcome = await executeTrailSourceTransition(plan, {
      compensateTarget: async () => {
        events.push("compensate");
        return "target-compensated";
      },
      executeSource: async () => {
        events.push("source-delete");
        return "source-absent";
      },
      executeTarget: async () => {
        events.push("target-create");
        throw failure;
      },
      observeSource: async () => observation("present", "source-present"),
      observeTarget: async () => {
        events.push("target-observe");
        return observation("absent", "target-absent");
      },
      preflight: async () => undefined,
    });

    expect(events).toEqual(["target-create", "target-observe"]);
    expect(outcome).toEqual({ error: failure, kind: "unchanged" });
  });

  it("compensates once when source deletion fails and the source remains safe", async () => {
    const events: string[] = [];
    const failure = new Error("source delete failed");
    const outcome = await executeTrailSourceTransition(plan, {
      compensateTarget: async () => {
        events.push("target-compensate");
        return "target-absent";
      },
      executeSource: async () => {
        events.push("source-delete");
        throw failure;
      },
      executeTarget: async () => {
        events.push("target-create");
        return "target-present";
      },
      observeSource: async () => {
        events.push("source-observe");
        return observation("present", "source-present");
      },
      observeTarget: async () => observation("present", "target-present"),
      preflight: async () => undefined,
    });

    expect(events).toEqual([
      "target-create",
      "source-delete",
      "source-observe",
      "target-compensate",
    ]);
    expect(outcome).toEqual({
      error: failure,
      kind: "compensated",
      recovered: false,
      source: "source-present",
      target: "target-absent",
    });
  });

  it("treats an ambiguous source state as partial instead of guessing", async () => {
    const events: string[] = [];
    const failure = new Error("source delete failed");
    const outcome = await executeTrailSourceTransition(plan, {
      compensateTarget: async () => {
        events.push("target-compensate");
        return "target-absent";
      },
      executeSource: async () => {
        events.push("source-delete");
        throw failure;
      },
      executeTarget: async () => "target-present",
      observeSource: async () => {
        events.push("source-observe");
        return { kind: "unsafe" };
      },
      observeTarget: async () => observation("present", "target-present"),
      preflight: async () => undefined,
    });

    expect(events).toEqual(["source-delete", "source-observe"]);
    expect(outcome).toEqual({ error: failure, kind: "partial" });
  });

  it("recognizes successful compensation after an ambiguous compensation error", async () => {
    const original = new Error("source delete failed");
    const outcome = await executeTrailSourceTransition(plan, {
      compensateTarget: async () => {
        throw new Error("cleanup response lost");
      },
      executeSource: async () => {
        throw original;
      },
      executeTarget: async () => "target-present",
      observeSource: async () => observation("present", "source-present"),
      observeTarget: async () => observation("absent", "target-absent"),
      preflight: async () => undefined,
    });

    expect(outcome).toEqual({
      error: original,
      kind: "compensated",
      recovered: true,
      source: "source-present",
      target: "target-absent",
    });
  });
});
