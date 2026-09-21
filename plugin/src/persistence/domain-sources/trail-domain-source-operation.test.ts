import { describe, expect, it } from "vitest";

import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import { applyTrailDomainSourceMutation } from "./trail-domain-source-operation";

describe("Trail Domain Source logical mutation", () => {
  it("updates one CRLF Triage record while preserving neighboring record bytes", () => {
    const markdown = [
      "---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## First",
      '<!-- data {"id":"first","context":"triage","due":1800000000000} -->',
      "",
      "body-first",
      "",
      "## Second",
      '<!-- data {"id":"second","context":"triage","due":1800000000001} -->',
      "",
      "### Keep",
      "second body stays byte-identical",
      "",
    ].join("\r\n");
    const before = {
      context: "triage" as const,
      description: "body-first",
      due: 1_800_000_000_000,
      id: "first",
      labelIds: [],
      title: "First",
    };
    const next = applyTrailDomainSourceMutation({
      kind: "triage",
      markdown,
      mutation: {
        after: { kind: "issue", value: { ...before, title: "First updated" } },
        before: { kind: "issue", value: before },
        kind: "replace",
      },
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Triage.md",
    });

    expect(next).toContain("## First updated\r\n");
    expect(next).toContain([
      "## Second",
      '<!-- data {"id":"second","context":"triage","due":1800000000001} -->',
      "",
      "### Keep",
      "second body stays byte-identical",
      "",
    ].join("\r\n"));
    expect(next).not.toContain("\n## Second\n");
  });
  it("deletes the final record without leaving the separator blank line at EOF", () => {
    const markdown = [
      "---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## Last",
      '<!-- data {"id":"last","context":"triage","due":1800000000000} -->',
      "",
    ].join("\r\n");
    const before = {
      context: "triage" as const,
      due: 1_800_000_000_000,
      id: "last",
      labelIds: [],
      title: "Last",
    };

    const next = applyTrailDomainSourceMutation({
      kind: "triage",
      markdown,
      mutation: {
        before: { kind: "issue", value: before },
        kind: "delete",
      },
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Triage.md",
    });

    expect(next).toBe([
      "---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
    ].join("\r\n"));
  });

  it("rewrites a closed Cycle label from Current start to its actual lifecycle span", () => {
    const before = {
      id: "cycle-a",
      issueIds: [],
      plannedEnd: Date.UTC(2026, 8, 30, 12),
      startedAt: Date.UTC(2026, 8, 20, 12),
    };
    const after = {
      ...before,
      endedAt: Date.UTC(2026, 8, 27, 12),
    };
    const markdown = [
      "---",
      "kind: cycles",
      "---",
      "",
      "# Cycles",
      "",
      "## Current: 2026-09-20",
      '<!-- data {"id":"cycle-a","startedAt":1789905600000,"plannedEnd":1790769600000,"issueIds":[]} -->',
      "",
    ].join("\n");

    const next = applyTrailDomainSourceMutation({
      kind: "cycles",
      markdown,
      mutation: {
        after: { kind: "cycle", value: after },
        before: { kind: "cycle", value: before },
        kind: "replace",
      },
      options: { cycleTimezone: "UTC" },
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Cycles.md",
    });

    expect(next).toContain("## 2026-09-20 to 2026-09-27\n");
    expect(next).not.toContain("## Current: 2026-09-20\n");
  });

});
