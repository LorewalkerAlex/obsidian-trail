import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../../domain/trail-issue";
import {
  parseCyclesMarkdown,
  parseInitiativeMarkdown,
  parseProjectlessIssuesMarkdown,
  serializeCyclesMarkdown,
  serializeInitiativeMarkdown,
  serializeProjectlessIssuesMarkdown,
  type TrailPhysicalCycleRecord,
  type TrailPhysicalInitiativeRecord,
} from "./trail-frozen-source-codecs";

function parseYaml(yaml: string): unknown {
  const value: Record<string, unknown> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    value[key] = key === "id" ? JSON.parse(raw) : raw;
  }
  return value;
}

describe("Frozen Formal source codecs", () => {
  it("round-trips the frozen Initiative physical contract without adding behavior", () => {
    const initiative: TrailPhysicalInitiativeRecord = {
      description: "Long-term outcome.",
      due: 200,
      id: "initiative-a",
      labelIds: ["label-z", "label-a"],
      priority: "high",
      title: "Household Finance",
    };
    const result = parseInitiativeMarkdown({
      filePath: "Trail/Initiatives/0001 Household Finance.md",
      markdown: serializeInitiativeMarkdown(initiative),
      parseYaml,
    });

    expect(result.issues).toEqual([]);
    expect(result.initiative).toEqual({
      ...initiative,
      labelIds: ["label-a", "label-z"],
    });
  });

  it("round-trips canonical Projectless Workflow Issue records", () => {
    const issue: TrailWorkflowIssue = {
      context: "workflow",
      createdAt: 100,
      due: 200,
      id: "issue-a",
      labelIds: ["label-z", "label-a"],
      statusDefinitionId: "status-todo",
      title: "Renew passport",
    };
    const result = parseProjectlessIssuesMarkdown({
      filePath: "Trail/Collections/Projectless Issues.md",
      markdown: serializeProjectlessIssuesMarkdown([issue]),
      parseYaml,
    });

    expect(result.issues).toEqual([]);
    expect(result.issuesById[issue.id]).toEqual({
      ...issue,
      labelIds: ["label-a", "label-z"],
    });
  });

  it("round-trips canonical Cycle records and canonicalizes Set carriers", () => {
    const cycle: TrailPhysicalCycleRecord = {
      id: "cycle-a",
      issueIds: ["issue-z", "issue-a"],
      label: "2026-08-11",
      plannedEnd: 300,
      startedAt: 100,
    };
    const result = parseCyclesMarkdown({
      filePath: "Trail/Collections/Cycles.md",
      markdown: serializeCyclesMarkdown([cycle]),
      parseYaml,
    });

    expect(result.issues).toEqual([]);
    expect(result.cyclesById[cycle.id]).toEqual({
      ...cycle,
      issueIds: ["issue-a", "issue-z"],
    });
  });
});
