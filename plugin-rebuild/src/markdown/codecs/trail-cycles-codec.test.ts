import { describe, expect, it } from "vitest";
import type { TrailCycle } from "../../domain/model/trail-entities";
import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import {
  parseCyclesMarkdown,
  serializeCyclesMarkdown,
} from "./trail-cycles-codec";

describe("Cycles Markdown codec", () => {
  it("round-trips Cycle facts while treating the H2 label as derived", () => {
    const cycle: TrailCycle = {
      id: "cycle-a",
      issueIds: ["issue-z", "issue-a"],
      plannedEnd: 1_800_000_000_000,
      startedAt: 1_700_000_000_000,
    };
    const markdown = serializeCyclesMarkdown([cycle], () => "2026-08-16");
    const parsed = parseCyclesMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Cycles.md",
    });

    expect(parsed.issues).toEqual([]);
    expect(parsed.document?.cycles).toEqual([{ ...cycle, issueIds: ["issue-a", "issue-z"] }]);
    expect(markdown).toContain("## 2026-08-16");
  });

  it("reports a Cycle body instead of silently treating it as Domain data", () => {
    const markdown = [
      "---",
      "kind: cycles",
      "---",
      "",
      "# Cycles",
      "",
      "## 2026-08-16",
      '<!-- data {"id":"cycle-a","startedAt":1700000000000,"plannedEnd":1800000000000} -->',
      "",
      "unexpected body",
      "",
    ].join("\n");
    const parsed = parseCyclesMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Cycles.md",
    });

    expect(parsed.document?.cycles).toEqual([]);
    expect(parsed.issues.some((issue) => issue.message.includes("must not contain a description body"))).toBe(true);
  });
});
