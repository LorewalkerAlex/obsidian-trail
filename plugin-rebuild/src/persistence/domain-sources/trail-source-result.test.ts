import { describe, expect, it } from "vitest";
import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import { parseTriageMarkdown } from "../../markdown/codecs/trail-triage-codec";
import { triageSourceResult } from "./trail-source-result";

describe("Trail persistence source result boundary", () => {
  it("strips Markdown source ranges before exposing authoritative snapshots", () => {
    const sourcePath = "Trail/Collections/Triage.md";
    const parsed = parseTriageMarkdown({
      markdown: [
        "---",
        "kind: triage",
        "---",
        "",
        "# Issues",
        "",
        "## Capture",
        '<!-- data {"id":"issue-a","context":"triage","due":1800000000000} -->',
        "",
      ].join("\n"),
      parseYaml: parseTrailTestYaml,
      sourcePath,
    });
    expect(parsed.document?.locationsByIssueId["issue-a"]).toBeDefined();

    const result = triageSourceResult(parsed, sourcePath);
    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted") throw new Error("expected accepted source");
    expect(result.snapshot.kind).toBe("triage");
    expect("locationsByIssueId" in result.snapshot).toBe(false);
  });
});
